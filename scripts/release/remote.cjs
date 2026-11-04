// Executed by the hosting Node 22 binary. Built-ins only; never touches a database.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { validateEnvelope, newerVersion } = require('./app-updates.cjs');
const DEFAULT_ROOT = '/home/hwqrwrir/app-updates';
const DEFAULT_LOCK = '/home/hwqrwrir/apps/oufeidun/.deploy-lock';
const FEED = 'https://oufeidun.vn/app-updates/stable/local-mysql-win32-x64.json';
const NAME = 'local-mysql-win32-x64.json';
function directory(directoryPath) {
  if (fs.realpathSync(directoryPath) !== path.resolve(directoryPath) || !fs.statSync(directoryPath).isDirectory()) throw Error('Non-canonical directory');
}
function regular(file) {
  if (!fs.lstatSync(file).isFile()) throw Error('Expected regular file');
}
function readRelease(file, publicKey) {
  regular(file);
  if (fs.statSync(file).size > 64000) throw Error('Manifest too large');
  return validateEnvelope(JSON.parse(fs.readFileSync(file, 'utf8')), publicKey, FEED, 'x64', 'local-mysql');
}
function allowRelease(next, current) {
  if (!current) return;
  if (next.version === current.version && next.sha256 === current.sha256 && next.size === current.size) return;
  if (!newerVersion(next.version, current.version)) throw Error('Refusing downgrade or replacement of published version');
}
function checkQuota(result, bytes) {
  const remaining = Number(result?.result?.data?.megabytes_remain);
  if (result?.result?.status !== 1 || !Number.isFinite(remaining) || remaining < bytes / 1048576 + 256) throw Error('Insufficient or unknown hosting quota (256 MiB reserve required)');
}
async function hash(file) {
  regular(file);
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function acquire(lock, timeout = 180000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    try { fs.mkdirSync(lock, { mode: 0o700 }); return; }
    catch (error) { if (error.code !== 'EEXIST' || Date.now() >= deadline) throw Error('Deployment lock busy; retry later'); }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
async function health() {
  const response = await fetch('https://oufeidun.vn/', { redirect: 'error', signal: AbortSignal.timeout(20000) });
  await response.body?.cancel();
  if (!response.ok) throw Error('Website health check failed');
}
async function main(options = {}) {
  const ROOT = options.root || DEFAULT_ROOT, LOCK = options.lock || DEFAULT_LOCK;
  const healthCheck = options.healthCheck || health;
  const fetchFeed = options.fetchFeed || (url => fetch(url, { redirect: 'error', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(20000) }));
  const [command, id] = options.command ? [options.command, options.id] : process.argv.slice(2);
  if (!['prepare', 'commit'].includes(command) || !/^[a-f0-9]{40}-\d+-\d+$/.test(id)) throw Error('Invalid publication command');
  directory(ROOT); directory(path.join(ROOT, '.ci-incoming'));
  const stage = path.join(ROOT, '.ci-incoming', id); directory(stage);
  const config = JSON.parse(fs.readFileSync(path.join(stage, 'update-config.json'), 'utf8'));
  const pin = path.join(ROOT, 'trusted-public-key.pem');
  // This public key arrives over pinned SSH, never from a public HTTP request.
  if (!fs.existsSync(pin)) fs.writeFileSync(pin, config.publicKey, { flag: 'wx', mode: 0o600 });
  regular(pin);
  const publicKey = fs.readFileSync(pin, 'utf8');
  if (publicKey !== config.publicKey) throw Error('Signing identity differs from host pin');
  directory(path.join(ROOT, 'stable')); directory(path.join(ROOT, 'files'));
  const nextFile = path.join(stage, NAME);
  const next = readRelease(nextFile, publicKey);
  const currentFile = path.join(ROOT, 'stable', NAME);
  const current = () => fs.existsSync(currentFile) ? readRelease(currentFile, publicKey) : null;
  allowRelease(next, current());
  if (command === 'prepare') {
    checkQuota(JSON.parse(execFileSync('uapi', ['--output=json', 'Quota', 'get_quota_info'], { encoding: 'utf8', timeout: 20000 })), next.size);
    await healthCheck();
    console.log('Preflight passed: signature, version, quota and website health'); return;
  }
  const incoming = path.join(stage, 'installer.exe');
  if (fs.statSync(incoming).size !== next.size || await hash(incoming) !== next.sha256) throw Error('Uploaded installer mismatch');
  await acquire(LOCK);
  let backup, changed = false;
  const temporary = `${currentFile}.upload-${id}`;
  try {
    const previous = current(); allowRelease(next, previous);
    await healthCheck();
    const destination = path.join(ROOT, 'files', `${next.sha256}.exe`);
    if (fs.existsSync(destination)) {
      if (fs.statSync(destination).size !== next.size || await hash(destination) !== next.sha256) throw Error('Immutable installer mismatch');
    } else {
      fs.linkSync(incoming, destination); // atomic, refuses overwrite, same hosting filesystem
      fs.chmodSync(destination, 0o644);
    }
    if (previous) {
      backup = `${currentFile}.before-${id}`;
      fs.copyFileSync(currentFile, backup, fs.constants.COPYFILE_EXCL);
    }
    fs.copyFileSync(nextFile, temporary, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(temporary, 0o644);
    fs.renameSync(temporary, currentFile); changed = true; // manifest LAST
    const response = await fetchFeed(`${FEED}?ci=${id}`);
    if (!response.ok) throw Error('Public feed unavailable');
    const published = validateEnvelope(await response.json(), publicKey, FEED, 'x64', 'local-mysql');
    if (published.sha256 !== next.sha256 || published.version !== next.version) throw Error('Public feed mismatch');
    await healthCheck();
    console.log(`Published LOCAL ${next.version}; verified public signed feed`);
  } catch (error) {
    if (changed) {
      if (backup) { fs.copyFileSync(backup, temporary); fs.renameSync(temporary, currentFile); }
      else fs.unlinkSync(currentFile);
    }
    throw error;
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    fs.rmdirSync(LOCK); // only the lock this invocation acquired
  }
}
module.exports = { allowRelease, checkQuota, acquire, directory, readRelease, main };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
