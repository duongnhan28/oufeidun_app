import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const { AppUpdates, validateEnvelope, newerVersion } = createRequire(import.meta.url)('../electron/app-updates.cjs');
const keys = generateKeyPairSync('ed25519');
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' });
const bytes = Buffer.from('fixture installer - not executable');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const feedUrl = 'https://oufeidun.vn/app-updates/stable/local-mysql-win32-x64.json';
const release = { schema: 1, component: 'client', profile: 'local-mysql', platform: 'win32', arch: 'x64', channel: 'stable',
  version: '0.1.2', notes: 'Bản thử', size: bytes.length, sha256, requiresServerUpdate: false,
  url: `https://oufeidun.vn/app-updates/files/${sha256}.exe` };
const envelope = (value = release) => { const payload = JSON.stringify(value); return { payload, signature: sign(null, Buffer.from(payload), keys.privateKey).toString('base64') }; };

test('update versions are numeric, strict and never downgrade', () => {
  assert.equal(newerVersion('0.1.10', '0.1.9'), true);
  assert.equal(newerVersion('0.1.1', '0.1.1'), false);
  assert.equal(newerVersion('0.1.0', '0.1.1'), false);
  for (const version of ['1.0', '01.0.0', '1.0.0-beta', '1.0.0;cmd', '9007199254740992.0.0']) assert.throws(() => newerVersion(version, '0.1.1'));
});
test('signed feed rejects tampering, wrong key, profile, architecture, server upgrades and external URLs', () => {
  assert.equal(validateEnvelope(envelope(), publicKey, feedUrl, 'x64').version, '0.1.2');
  const edited = envelope(); edited.payload = edited.payload.replace('0.1.2', '9.9.9');
  assert.throws(() => validateEnvelope(edited, publicKey, feedUrl, 'x64'));
  const other = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
  assert.throws(() => validateEnvelope(envelope(), other, feedUrl, 'x64'));
  for (const patch of [{ profile: 'production-mysql' }, { component: 'server' }, { requiresServerUpdate: true }, { arch: 'arm64' },
    { url: 'https://evil.test/app.exe' }, { url: `http://oufeidun.vn/app-updates/files/${sha256}.exe` },
    { url: release.url + '?token=private' }, { size: 2 ** 31 }, { size: -1 }, { sha256: 'bad' }]) {
    assert.throws(() => validateEnvelope(envelope({ ...release, ...patch }), publicKey, feedUrl, 'x64'));
  }
});
test('download is opt-in, verifies checksum, preserves other files and only exposes verified file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oufeidun-update-test-'));
  try {
    await writeFile(join(directory, 'connection.json'), 'keep my config');
    const calls: string[] = [];
    const updater = new AppUpdates({ version: '0.1.1', config: { publicKey, feedUrl }, directory, architecture: 'x64',
      fetcher: async (url: string, options: RequestInit) => {
        assert.equal(options.redirect, 'error'); calls.push(url);
        return url === feedUrl ? Response.json(envelope()) : new Response(bytes, { headers: { 'content-length': String(bytes.length) } });
      } });
    assert.equal((await updater.check()).phase, 'available');
    assert.deepEqual(calls, [feedUrl]);
    assert.equal(await updater.verifiedFile(), null);
    assert.equal((await updater.download()).phase, 'downloaded');
    const file = await updater.verifiedFile(); assert.ok(file);
    assert.deepEqual(await readFile(file), bytes);
    assert.equal(await readFile(join(directory, 'connection.json'), 'utf8'), 'keep my config');
    await writeFile(file, 'tampered');
    await assert.rejects(updater.verifiedFile());
    assert.equal(updater.snapshot().phase, 'error');
    assert.equal((await updater.download()).phase, 'downloaded');
    await rm(await updater.verifiedFile());
    await assert.rejects(updater.verifiedFile());
    assert.equal(updater.snapshot().phase, 'error');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('bad hash, truncated and oversized downloads are removed and never offered', async () => {
  for (const data of [Buffer.from('wrong'), Buffer.alloc(bytes.length + 1), Buffer.alloc(bytes.length)]) {
    const directory = await mkdtemp(join(tmpdir(), 'oufeidun-update-test-'));
    try {
      const updater = new AppUpdates({ version: '0.1.1', config: { publicKey, feedUrl }, directory, architecture: 'x64',
        fetcher: async (url: string) => url === feedUrl ? Response.json(envelope()) : new Response(data) });
      await updater.check(); assert.equal((await updater.download()).phase, 'error');
      assert.equal(await updater.verifiedFile(), null); assert.deepEqual(await readdir(directory), []);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
});
test('unconfigured key, unpublished feed and network errors fail safely', async () => {
  const config = { publicKey, feedUrl };
  const disabled = new AppUpdates({ version: '0.1.1', config: { ...config, publicKey: '' }, directory: '.', fetcher: () => { throw Error('must not fetch'); } });
  assert.equal((await disabled.check()).phase, 'disabled');
  for (const [fetcher, phase] of [[async () => new Response(null, { status: 404 }), 'unpublished'], [async () => { throw Error('offline'); }, 'error'], [async () => new Response('x'.repeat(65000)), 'error']] as const) {
    const updater = new AppUpdates({ version: '0.1.1', config, directory: '.', fetcher });
    assert.equal((await updater.check()).phase, phase);
    assert.equal((await updater.download()).phase, phase);
  }
});
