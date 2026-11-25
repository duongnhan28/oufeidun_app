// CI-only SSH transport. Keys live only in the runner's private temporary directory.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { validateEnvelope } = require('../../electron/app-updates.cjs');
const ROOT = '/home/hwqrwrir/app-updates';
const NODE = '/opt/alt/alt-nodejs22/root/usr/bin/node';
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
async function main() {
  if (process.platform !== 'linux') throw Error('Publication transport requires Linux runner');
  const version = require('../../package.json').version;
  if (process.env.GITHUB_REF !== `refs/tags/v${version}`) throw Error('Publication requires matching version tag');
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const id = `${sha}-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`;
  if (!/^[a-f0-9]{40}-\d+-\d+$/.test(id)) throw Error('Invalid CI identifier');
  const host = process.env.DEPLOY_SSH_HOST, user = process.env.DEPLOY_SSH_USER, port = process.env.DEPLOY_SSH_PORT;
  if (!/^[a-zA-Z0-9.-]+$/.test(host || '') || !/^[a-z_][a-z0-9_-]*$/.test(user || '') || !/^\d{1,5}$/.test(port || '') || +port < 1 || +port > 65535) throw Error('Invalid SSH configuration');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'app-release-')); fs.chmodSync(directory, 0o700);
  const stage = `${ROOT}/.ci-incoming/${id}`;
  try {
    const key = path.join(directory, 'key'), known = path.join(directory, 'known_hosts');
    for (const [file, value] of [[key, process.env.DEPLOY_SSH_KEY], [known, process.env.DEPLOY_SSH_KNOWN_HOSTS]]) {
      if (!value) throw Error('Missing SSH secret');
      fs.writeFileSync(file, value.trim() + '\n', { mode: 0o600 });
    }
    const options = ['-i', key, '-o', `UserKnownHostsFile=${known}`, '-o', 'StrictHostKeyChecking=yes', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=4'];
    const ssh = command => execFileSync('ssh', [...options, '-p', port, `${user}@${host}`, command], { stdio: 'inherit', timeout: 600000 });
    // The ~170 MB installer upload to the shared host has taken just over 10 minutes; allow 30.
    const put = (local, name, timeout = 600000) => execFileSync('scp', [...options, '-P', port, local, `${user}@${host}:${stage}/${name}`], { stdio: 'inherit', timeout });
    const envelopeFile = '.local/signed/stable/local-mysql-win32-x64.json';
    const config = require('../../electron/update-config.json');
    const release = validateEnvelope(JSON.parse(fs.readFileSync(envelopeFile)), config.publicKey, new URL('local-mysql-win32-x64.json', config.feedBaseUrl).href, 'x64', 'local-mysql');
    ssh(`umask 077; mkdir -p ${quote(ROOT + '/.ci-incoming')}; mkdir ${quote(stage)}`);
    let completed = false;
    try {
      put('scripts/release/remote.cjs', 'remote.cjs');
      put('electron/app-updates.cjs', 'app-updates.cjs');
      put('electron/update-config.json', 'update-config.json');
      put(envelopeFile, 'local-mysql-win32-x64.json');
      ssh(`${quote(NODE)} ${quote(stage + '/remote.cjs')} prepare ${quote(id)}`);
      put(`.local/signed/files/${release.sha256}.exe`, 'installer.exe', 1800000);
      ssh(`${quote(NODE)} ${quote(stage + '/remote.cjs')} commit ${quote(id)}`);
      completed = true;
    } finally {
      // A disconnected SSH process may still be publishing remotely. Retain its
      // staging on failure rather than deleting files from underneath it.
      if (completed) ssh(`rm -rf -- ${quote(stage)}`);
      else console.error(`Publication interrupted; inspect remote staging ${stage} before cleanup or retry.`);
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}
main().catch(() => { console.error('Client publication failed. Check preflight/remote logs; no secrets are printed.'); process.exitCode = 1; });
