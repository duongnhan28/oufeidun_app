const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { guard } = require('./ci.cjs');
const { allowRelease, checkQuota, acquire, directory, main } = require('./remote.cjs');

test('only matching stable version tags pass release guard', () => {
  guard('0.1.4', 'refs/tags/v0.1.4'); guard('0.1.3', 'refs/heads/main');
  for (const [version, tag] of [['0.1.3', 'refs/tags/v0.1.4'], ['0.1.4-beta', 'refs/tags/v0.1.4-beta'], ['01.1.4', 'refs/heads/main']]) assert.throws(() => guard(version, tag));
});
function fixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'release-publish-')));
  const id = `${'a'.repeat(40)}-123-1`, name = 'local-mysql-win32-x64.json';
  const stage = path.join(root, '.ci-incoming', id);
  fs.mkdirSync(stage, { recursive: true }); fs.mkdirSync(path.join(root, 'stable')); fs.mkdirSync(path.join(root, 'files'));
  const keys = crypto.generateKeyPairSync('ed25519');
  const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' });
  fs.writeFileSync(path.join(stage, 'update-config.json'), JSON.stringify({ publicKey }));
  const bytes = Buffer.from('MZ fixture installer bytes');
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const release = { schema: 1, component: 'client', profile: 'local-mysql', platform: 'win32', arch: 'x64', channel: 'stable', version: '0.1.4', notes: 'Fixture', size: bytes.length, sha256, requiresServerUpdate: false, url: `https://oufeidun.vn/app-updates/files/${sha256}.exe` };
  const sign = value => { const payload = JSON.stringify(value); return JSON.stringify({ payload, signature: crypto.sign(null, Buffer.from(payload), keys.privateKey).toString('base64') }); };
  const previous = sign({ ...release, version: '0.1.3' });
  const current = path.join(root, 'stable', name);
  fs.writeFileSync(current, previous); fs.writeFileSync(path.join(stage, name), sign(release)); fs.writeFileSync(path.join(stage, 'installer.exe'), bytes);
  const lock = path.join(root, '.deploy-lock');
  const options = { root, lock, id, command: 'commit', healthCheck: async () => {}, fetchFeed: async () => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(current)) }) };
  return { root, stage, current, previous, options, release };
}
test('publishes verified installer then manifest, preserving history and unrelated data', async () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.root, 'connection.json'), 'preserve config');
    await main(f.options);
    assert.equal(JSON.parse(JSON.parse(fs.readFileSync(f.current)).payload).version, '0.1.4');
    assert.ok(fs.existsSync(path.join(f.root, 'files', `${f.release.sha256}.exe`)));
    assert.equal(fs.readFileSync(`${f.current}.before-${f.options.id}`, 'utf8'), f.previous);
    assert.equal(fs.readFileSync(path.join(f.root, 'connection.json'), 'utf8'), 'preserve config');
    assert.equal(fs.existsSync(f.options.lock), false);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});
test('public verification failure rolls feed back and releases owned lock', async () => {
  const f = fixture();
  try {
    await assert.rejects(main({ ...f.options, fetchFeed: async () => ({ ok: false }) }), /Public feed/);
    assert.equal(fs.readFileSync(f.current, 'utf8'), f.previous);
    assert.equal(fs.existsSync(f.options.lock), false);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});
test('corrupt installer or invalid signature never changes current feed', async () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.stage, 'installer.exe'), 'corrupted');
    await assert.rejects(main(f.options), /installer mismatch/);
    assert.equal(fs.readFileSync(f.current, 'utf8'), f.previous);
    const manifest = path.join(f.stage, 'local-mysql-win32-x64.json');
    const envelope = JSON.parse(fs.readFileSync(manifest)); envelope.payload += ' ';
    fs.writeFileSync(manifest, JSON.stringify(envelope));
    await assert.rejects(main(f.options), /signature/);
    assert.equal(fs.readFileSync(f.current, 'utf8'), f.previous);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});
test('publisher refuses older versions and rebuilt existing versions', () => {
  const current = { version: '0.1.3', sha256: 'a', size: 100 };
  allowRelease(current, current); allowRelease({ ...current, version: '0.1.4' }, current);
  assert.throws(() => allowRelease({ ...current, version: '0.1.2' }, current));
  assert.throws(() => allowRelease({ ...current, sha256: 'b' }, current));
  assert.throws(() => allowRelease({ ...current, size: 200 }, current));
});
test('quota must cover upload and reserve, and unknown quota fails closed', () => {
  const quota = remain => ({ result: { status: 1, data: { megabytes_remain: remain } } });
  checkQuota(quota(500), 175 * 1048576);
  assert.throws(() => checkQuota(quota(400), 175 * 1048576));
  assert.throws(() => checkQuota({}, 10));
});
test('an existing deployment lock is never stolen', async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'release-lock-'));
  try {
    const lock = path.join(temporary, '.deploy-lock');
    await acquire(lock, 0); fs.writeFileSync(path.join(lock, 'owner'), 'another invocation');
    await assert.rejects(acquire(lock, 0), /lock busy/);
    assert.equal(fs.readFileSync(path.join(lock, 'owner'), 'utf8'), 'another invocation');
    directory(temporary);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
