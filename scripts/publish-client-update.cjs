// Offline release preparation only. Never uploads, runs installers or migrates DB.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateEnvelope } = require('../electron/app-updates.cjs');

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'init-key') {
    const keyFile = path.resolve(args[0] || path.join(require('node:os').homedir(), '.ssh', 'oufeidun_update_signing.pem'));
    if (fs.existsSync(keyFile)) throw Error('Key already exists; do not overwrite signing identity');
    const configFile = path.resolve('electron/update-config.json');
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    if (config.publicKey) throw Error('Public key already configured; key rotation needs an explicit plan');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    fs.mkdirSync(path.dirname(keyFile), { recursive: true });
    fs.writeFileSync(keyFile, privateKey.export({ type: 'pkcs8', format: 'pem' }), { flag: 'wx', mode: 0o600 });
    fs.writeFileSync(configFile, JSON.stringify({ ...config, publicKey: publicKey.export({ type: 'spki', format: 'pem' }) }, null, 2) + '\n');
    console.log('Signing identity created. Back up the PRIVATE key securely outside Git. Public key configured in electron/update-config.json.');
    return;
  }
  if (command !== 'prepare' || args.length !== 6) throw Error('Usage: prepare INSTALLER VERSION local-mysql|production-mysql NOTES_FILE PRIVATE_KEY OUTPUT_DIRECTORY');
  const [installer, version, profile, notesFile, keyFile, output] = args;
  if (!['local-mysql', 'production-mysql'].includes(profile)) throw Error('Invalid profile');
  const packageVersion = require('../package.json').version;
  if (version !== packageVersion) throw Error('Release version must equal package.json version. Bump and rebuild before preparing.');
  if (path.extname(installer).toLowerCase() !== '.exe') throw Error('Expected Windows client installer, not server archive');
  const stat = fs.statSync(installer);
  const digest = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(installer)) digest.update(chunk);
  const sha256 = digest.digest('hex');
  const release = { schema: 1, component: 'client', profile, platform: 'win32', arch: 'x64', channel: 'stable',
    version, notes: fs.readFileSync(notesFile, 'utf8').trim(), size: stat.size, sha256,
    requiresServerUpdate: false, url: `https://oufeidun.vn/app-updates/files/${sha256}.exe` };
  const payload = JSON.stringify(release);
  const keyMaterial = keyFile === 'ENV:APP_UPDATE_SIGNING_KEY'
    ? process.env.APP_UPDATE_SIGNING_KEY : fs.readFileSync(keyFile);
  if (!keyMaterial) throw Error('Missing signing key');
  const privateKey = crypto.createPrivateKey(keyMaterial);
  if (privateKey.asymmetricKeyType !== 'ed25519') throw Error('Expected Ed25519 signing key');
  const envelope = { payload, signature: crypto.sign(null, Buffer.from(payload), privateKey).toString('base64') };
  const config = require('../electron/update-config.json');
  validateEnvelope(envelope, config.publicKey, new URL(`${profile}-win32-x64.json`, config.feedBaseUrl).href, 'x64', profile);
  const directory = path.resolve(output);
  fs.mkdirSync(path.join(directory, 'files'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'stable'), { recursive: true });
  const destination = path.join(directory, 'files', `${sha256}.exe`);
  if (!fs.existsSync(destination)) fs.copyFileSync(installer, destination, fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(directory, 'stable', `${profile}-win32-x64.json`), JSON.stringify(envelope) + '\n', { flag: 'wx' });
  console.log('Prepared signed client release. Upload installer first, verify checksum, then publish manifest atomically LAST. No upload performed.');
}
main().catch(() => { console.error('Update preparation failed. Check arguments, version, signing key and output paths. No release was published.'); process.exitCode = 1; });
