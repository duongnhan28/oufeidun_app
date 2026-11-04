const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Transform, Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { createWriteStream } = require('node:fs');

const MAX_PACKAGE = 1024 * 1024 * 1024;
function versionParts(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) throw Error('Invalid version');
  const parts = value.split('.').map(Number);
  if (parts.some(n => !Number.isSafeInteger(n))) throw Error('Invalid version');
  return parts;
}
function newerVersion(next, current) {
  const a = versionParts(next), b = versionParts(current);
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i]; }
  return false;
}
function validateEnvelope(envelope, publicKey, feedUrl, architecture = process.arch, profile = 'local-mysql') {
  if (!envelope || typeof envelope.payload !== 'string' || envelope.payload.length > 48000 ||
      typeof envelope.signature !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(envelope.signature)) throw Error('Invalid envelope');
  const key = crypto.createPublicKey(publicKey);
  if (key.asymmetricKeyType !== 'ed25519' || !crypto.verify(null, Buffer.from(envelope.payload), key, Buffer.from(envelope.signature, 'base64'))) throw Error('Invalid update signature');
  const release = JSON.parse(envelope.payload);
  versionParts(release.version);
  const feed = new URL(feedUrl), url = new URL(release.url);
  if (release.schema !== 1 || release.platform !== 'win32' || release.arch !== architecture ||
      release.channel !== 'stable' || release.component !== 'client' || release.profile !== profile || release.requiresServerUpdate !== false ||
      !Number.isSafeInteger(release.size) || release.size < 1 || release.size > MAX_PACKAGE ||
      !/^[a-f0-9]{64}$/.test(release.sha256) || typeof release.notes !== 'string' || release.notes.length > 4000 ||
      feed.protocol !== 'https:' || url.origin !== feed.origin || url.protocol !== 'https:' ||
      url.username || url.password || url.search || url.hash ||
      url.pathname !== `/app-updates/files/${release.sha256}.exe`) throw Error('Invalid release');
  return release;
}

class AppUpdates {
  constructor({ version, config, directory, fetcher = fetch, architecture = process.arch, profile = 'local-mysql' }) {
    versionParts(version);
    this.config = config; this.directory = directory; this.fetcher = fetcher; this.architecture = architecture; this.profile = profile;
    this.state = { currentVersion: version, phase: config.publicKey ? 'idle' : 'disabled' };
    this.release = null; this.file = null; this.busy = false;
  }
  snapshot() { return { ...this.state }; }
  async check() {
    if (this.busy || this.state.phase === 'downloaded' || !this.config.publicKey) return this.snapshot();
    this.busy = true; this.state = { currentVersion: this.state.currentVersion, phase: 'checking' };
    try {
      const response = await this.fetcher(this.config.feedUrl, { redirect: 'error', signal: AbortSignal.timeout(15000), cache: 'no-store' });
      if (response.status === 404) { this.state.phase = 'unpublished'; this.release = null; return this.snapshot(); }
      if (!response.ok || !response.body) throw Error('Feed unavailable');
      let bytes = 0; const chunks = [];
      for await (const chunk of response.body) {
        bytes += chunk.length; if (bytes > 64000) throw Error('Feed too large'); chunks.push(Buffer.from(chunk));
      }
      const release = validateEnvelope(JSON.parse(Buffer.concat(chunks).toString('utf8')), this.config.publicKey, this.config.feedUrl, this.architecture, this.profile);
      this.release = newerVersion(release.version, this.state.currentVersion) ? release : null;
      this.state.phase = this.release ? 'available' : 'current';
      if (this.release) Object.assign(this.state, { version: release.version, notes: release.notes, size: release.size });
    } catch { this.release = null; this.state.phase = 'error'; this.state.message = 'Không kiểm tra được bản cập nhật. Vui lòng thử lại sau.'; }
    finally { this.busy = false; }
    return this.snapshot();
  }
  async download() {
    if (this.busy || !this.release || !['available', 'error'].includes(this.state.phase)) return this.snapshot();
    this.busy = true; this.state.phase = 'downloading'; this.state.progress = 0; delete this.state.message;
    let partial;
    try {
      const release = this.release;
      await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
      partial = path.join(this.directory, `${crypto.randomUUID()}.part`);
      const destination = path.join(this.directory, `Oufeidun-${release.version}-${release.sha256}.exe`);
      const response = await this.fetcher(release.url, { redirect: 'error', signal: AbortSignal.timeout(20 * 60 * 1000) });
      if (response.status !== 200 || !response.body) throw Error('Download failed');
      const contentLength = response.headers.get('content-length');
      if (contentLength && Number(contentLength) !== release.size) throw Error('Size mismatch');
      const hash = crypto.createHash('sha256'); let size = 0;
      const meter = new Transform({ transform: (chunk, _encoding, callback) => {
        size += chunk.length;
        if (size > release.size) return callback(Error('Package too large'));
        hash.update(chunk); this.state.progress = Math.floor(size / release.size * 100); callback(null, chunk);
      } });
      await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(partial, { flags: 'wx', mode: 0o600 }));
      if (size !== release.size || hash.digest('hex') !== release.sha256) throw Error('Checksum mismatch');
      await fs.rename(partial, destination); this.file = destination;
      this.state.phase = 'downloaded'; this.state.progress = 100;
    } catch { this.file = null; this.state.phase = 'error'; this.state.message = 'Tải hoặc xác minh file thất bại. Vui lòng kiểm tra mạng và thử lại.'; }
    finally { if (partial) await fs.unlink(partial).catch(() => {}); this.busy = false; }
    return this.snapshot();
  }
  async verifiedFile() {
    if (!this.file || this.state.phase !== 'downloaded') return null;
    try {
      const { createReadStream } = require('node:fs');
      const hash = crypto.createHash('sha256'); let size = 0;
      for await (const chunk of createReadStream(this.file)) { size += chunk.length; hash.update(chunk); }
      if (size !== this.release.size || hash.digest('hex') !== this.release.sha256) throw Error('Downloaded file changed');
      return this.file;
    } catch {
      this.file = null; this.state.phase = 'error'; this.state.message = 'File đã thay đổi sau khi tải. Vui lòng tải lại.';
      throw Error('Downloaded file changed or missing');
    }
  }
}
module.exports = { AppUpdates, validateEnvelope, newerVersion };
