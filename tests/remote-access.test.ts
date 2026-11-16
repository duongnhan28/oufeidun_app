import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, writeFileSync, mkdtempSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const execute = promisify(execFile);
const windows = process.platform === 'win32';
// Let Windows PowerShell discover its own modules when the parent is PowerShell 7 (CI).
const powerShellEnv = { ...process.env };
delete powerShellEnv.PSModulePath;

test('BAT opens its menu from a folder with spaces and ampersand and exits successfully', { skip: !windows, timeout: 30000 }, async () => {
  mkdirSync('.local', { recursive: true });
  const folder = mkdtempSync(resolve('.local/remote BAT & spaces '));
  for (const name of ['KET-NOI-TU-XA.bat', 'remote-access.ps1']) {
    copyFileSync(resolve('deployment/customer/remote', name), join(folder, name));
  }
  const output = await new Promise<string>((resolveOutput, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', '& $env:OUFEIDUN_REMOTE_TEST_BAT'], {
      env: { ...powerShellEnv, OUFEIDUN_REMOTE_TEST_BAT: join(folder, 'KET-NOI-TU-XA.bat') },
      windowsHide: true,
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => stdout += chunk);
    child.stderr.on('data', chunk => stderr += chunk);
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolveOutput(stdout) : reject(Error('BAT failed ' + stderr)));
    child.stdin.end('0\n\n');
  });
  assert.match(output, /OUFEIDUN - TAILSCALE/);
});

test('remote setup preserves profiles on failure, restores LAN and scopes firewall to one VPN peer', { skip: !windows }, async () => {
  const result = await execute('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve('tests/remote-access.ps1')], { env: powerShellEnv });
  assert.match(result.stdout, /PASS HTTPS failure preserves cache/);
  assert.match(result.stdout, /PASS firewall limited to laptop IP/);
});

test('remote HTTPS probe trusts the store CA and rejects wrong hostname and wrong CA', { skip: !windows, timeout: 60000 }, async () => {
  const { fixture } = require('./lan-fixture.cjs');
  mkdirSync('.local', { recursive: true });
  const server = await fixture();
  let other;
  try {
    const script = join(server.dir, 'probe.ps1');
    const profile = join(server.dir, 'probe-profile.json');
    writeFileSync(script, "param($Module,$Profile)\n$ErrorActionPreference='Stop'\n. $Module\n$p=Get-Content -LiteralPath $Profile -Raw|ConvertFrom-Json\nTest-RemoteHealth $p '127.0.0.1'\n");
    const run = () => execute('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, resolve('deployment/customer/remote/remote-access.ps1'), profile], { env: powerShellEnv });
    writeFileSync(profile, JSON.stringify(server.profile));
    await run();
    writeFileSync(profile, JSON.stringify({ ...server.profile, hostName: 'wrong.home.arpa' }));
    await assert.rejects(run());
    other = await fixture();
    writeFileSync(profile, JSON.stringify({ ...server.profile, rootCertificatePem: other.profile.rootCertificatePem }));
    await assert.rejects(run());
  } finally {
    if (other) await other.close();
    await server.close();
  }
});
