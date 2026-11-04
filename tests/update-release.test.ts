import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const { validateEnvelope } = createRequire(import.meta.url)('../electron/app-updates.cjs');

test('release preparation signs fixtures, enforces package version and refuses key/manifest overwrite', () => {
  const root = mkdtempSync(join(tmpdir(), 'oufeidun-release-test-'));
  try {
    mkdirSync(join(root, 'scripts')); mkdirSync(join(root, 'electron'));
    copyFileSync(resolve('scripts/publish-client-update.cjs'), join(root, 'scripts/publish-client-update.cjs'));
    copyFileSync(resolve('electron/app-updates.cjs'), join(root, 'electron/app-updates.cjs'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '0.1.2' }));
    writeFileSync(join(root, 'electron/update-config.json'), JSON.stringify({ publicKey: '', feedBaseUrl: 'https://oufeidun.vn/app-updates/stable/' }));
    const key = join(root, 'fixture-private.pem');
    const run = (...args: string[]) => spawnSync(process.execPath, [join(root, 'scripts/publish-client-update.cjs'), ...args], { cwd: root, encoding: 'utf8' });
    const init = run('init-key', key); assert.equal(init.status, 0, init.stderr);
    assert.equal(init.stdout.includes('PRIVATE KEY-----'), false);
    const originalKey = readFileSync(key, 'utf8');
    assert.equal(run('init-key', key).status, 1); assert.equal(readFileSync(key, 'utf8'), originalKey);
    writeFileSync(join(root, 'fixture.exe'), 'fixture bytes - not executable');
    writeFileSync(join(root, 'notes.txt'), 'Fixture release');
    assert.equal(run('prepare', 'fixture.exe', '0.1.1', 'local-mysql', 'notes.txt', key, 'out').status, 1);
    assert.equal(run('prepare', 'fixture.exe', '0.1.2', 'local-mysql', 'notes.txt', key, 'out').status, 0);
    const envelope = JSON.parse(readFileSync(join(root, 'out/stable/local-mysql-win32-x64.json'), 'utf8'));
    const config = JSON.parse(readFileSync(join(root, 'electron/update-config.json'), 'utf8'));
    const release = validateEnvelope(envelope, config.publicKey, 'https://oufeidun.vn/app-updates/stable/local-mysql-win32-x64.json', 'x64');
    assert.equal(release.version, '0.1.2');
    assert.equal(readFileSync(join(root, 'out/files', release.sha256 + '.exe'), 'utf8'), 'fixture bytes - not executable');
    assert.equal(run('prepare', 'fixture.exe', '0.1.2', 'local-mysql', 'notes.txt', key, 'out').status, 1);
    const ci = spawnSync(process.execPath, [join(root, 'scripts/publish-client-update.cjs'), 'prepare', 'fixture.exe', '0.1.2', 'local-mysql', 'notes.txt', 'ENV:APP_UPDATE_SIGNING_KEY', 'ci-out'], {
      cwd: root, encoding: 'utf8', env: { ...process.env, APP_UPDATE_SIGNING_KEY: originalKey },
    });
    assert.equal(ci.status, 0, ci.stderr);
    assert.equal(ci.stdout.includes('PRIVATE KEY-----'), false);
    const ciEnvelope = JSON.parse(readFileSync(join(root, 'ci-out/stable/local-mysql-win32-x64.json'), 'utf8'));
    assert.equal(validateEnvelope(ciEnvelope, config.publicKey, 'https://oufeidun.vn/app-updates/stable/local-mysql-win32-x64.json', 'x64').sha256, release.sha256);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
