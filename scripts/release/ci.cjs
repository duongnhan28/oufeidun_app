const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
function guard(version, ref) {
  if (!VERSION.test(version)) throw Error('Expected stable numeric version');
  if (ref.startsWith('refs/tags/') && ref !== `refs/tags/v${version}`) throw Error('Tag must equal package version');
}
async function digest(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function main() {
  const command = process.argv[2];
  const version = require('../../package.json').version;
  const ref = process.env.GITHUB_REF || 'refs/heads/main';
  guard(version, ref);
  const notesFile = `docs/releases/${version}.md`;
  const notes = fs.readFileSync(notesFile, 'utf8').trim();
  if (!notes || notes.length > 4000) throw Error('Release notes required, maximum 4000 characters');
  if (command === 'guard') {
    if (ref.startsWith('refs/tags/')) execFileSync('git', ['merge-base', '--is-ancestor', 'HEAD', 'origin/main']);
    console.log(`Validated ${version}; ${ref.startsWith('refs/tags/') ? 'release tag' : 'build only'}`);
  } else if (command === 'local-env') {
    fs.writeFileSync('.env.local-mysql.local', 'VITE_SERVER_ENV=local\nVITE_DEMO_MODE=false\nVITE_DATA_BACKEND=api\nVITE_API_BASE_URL=https://oufeidun.home.arpa/api/app/v1\nVITE_GLASS_LOOKUP_API_URL=https://oufeidun.vn/api/glass-lookup\nVITE_SUPABASE_URL=\nVITE_SUPABASE_PUBLISHABLE_KEY=\n');
  } else if (command === 'stage') {
    const installer = 'out/make/squirrel.windows/x64/Oufeidun-Setup.exe';
    const proof = { version, sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), profile: 'local-mysql', sha256: await digest(installer), size: fs.statSync(installer).size };
    fs.mkdirSync('.local/ci-artifact', { recursive: true });
    fs.copyFileSync(installer, '.local/ci-artifact/Oufeidun-Setup.exe');
    fs.writeFileSync('.local/ci-artifact/release-proof.json', JSON.stringify(proof));
  } else if (command === 'verify') {
    const directory = process.argv[3];
    const proof = JSON.parse(fs.readFileSync(path.join(directory, 'release-proof.json')));
    const installer = path.join(directory, 'Oufeidun-Setup.exe');
    const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (proof.version !== version || proof.sourceSha !== sourceSha || proof.profile !== 'local-mysql' || proof.sha256 !== await digest(installer) || proof.size !== fs.statSync(installer).size) throw Error('Artifact proof mismatch');
    console.log('Verified artifact version, commit, profile, size and hash');
  } else throw Error('Unknown release command');
}
module.exports = { guard, digest };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
