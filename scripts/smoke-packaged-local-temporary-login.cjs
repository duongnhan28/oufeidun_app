const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

async function main() {
  const serverEnv = path.resolve(process.argv[2] || 'E:/OufeidunServerData/config/server.env');
  process.env.OUFEIDUN_SERVER_ENV = serverEnv;
  const runtimeCore = path.join(path.dirname(path.dirname(serverEnv)), 'app', 'src', 'core.cjs');
  const { pool, passwordHash } = require(runtimeCore);
  const [[admin]] = await pool.query("SELECT id,password_hash,session_device_id,session_token_hash,session_last_seen FROM app_users WHERE login_name='admin' LIMIT 1");
  if (!admin) throw new Error('Không tìm thấy tài khoản admin trong database local.');
  const temporaryPassword = `Smoke_${crypto.randomBytes(18).toString('base64url')}!`;
  let result;
  try {
    await pool.execute('UPDATE app_users SET password_hash=?,session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE id=?', [passwordHash(temporaryPassword), admin.id]);
    const loginProbe = await fetch('http://127.0.0.1:8787/api/app/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: temporaryPassword, device_id: `preflight-${crypto.randomUUID()}` }),
    });
    if (!loginProbe.ok) throw new Error(`Local API không nhận tài khoản smoke tạm thời (${loginProbe.status}).`);
    await pool.execute('UPDATE app_users SET session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE id=?', [admin.id]);
    result = spawnSync(process.execPath, [path.resolve(__dirname, 'smoke-packaged-local.cjs'), '--basic'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, OUFEIDUN_TEST_ADMIN_PASSWORD: temporaryPassword },
      encoding: 'utf8',
      timeout: 120000,
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  } finally {
    await pool.execute('UPDATE app_users SET password_hash=?,session_device_id=?,session_token_hash=?,session_last_seen=? WHERE id=?', [admin.password_hash, admin.session_device_id, admin.session_token_hash, admin.session_last_seen, admin.id]);
    await pool.end();
  }
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Packaged smoke thất bại với mã ${result.status}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
