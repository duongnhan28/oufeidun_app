const crypto = require('node:crypto');
const { pool, config, appError, assert, cleanText, hashToken, passwordMatches, publicUser, transaction, audit } = require('./core.cjs');

async function login(username, password, deviceId) {
  const loginName = cleanText(username, 100, true).toLowerCase();
  const device = cleanText(deviceId, 100, true);
  return transaction(async db => {
    const [[user]] = await db.execute('SELECT * FROM app_users WHERE login_name=? AND deleted_at IS NULL FOR UPDATE', [loginName]);
    if (!user || !passwordMatches(String(password || ''), user.password_hash)) throw appError('INVALID_CREDENTIALS', 401);
    if (!user.active) throw appError('ACCOUNT_DISABLED', 403);
    const freshSession = user.session_device_id && user.session_device_id !== device && user.session_last_seen &&
      Date.now() - new Date(String(user.session_last_seen).replace(' ', 'T') + '+07:00').getTime() < config.sessionIdleSeconds * 1000;
    if (freshSession) throw appError('SESSION_ALREADY_ACTIVE', 409);
    const token = crypto.randomBytes(32).toString('base64url');
    await db.execute('UPDATE app_users SET session_device_id=?,session_token_hash=?,session_last_seen=NOW(3) WHERE id=?', [device, hashToken(token), user.id]);
    await audit(db, user.id, 'auth.login', device);
    return { access_token: token, user: publicUser(user) };
  });
}

async function actorFromRequest(req, touch = true) {
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) throw appError('SESSION_REQUIRED', 401);
  const tokenHash = hashToken(authorization.slice(7));
  const [rows] = await pool.execute('SELECT * FROM app_users WHERE session_token_hash=? AND deleted_at IS NULL', [tokenHash]);
  const actor = rows[0];
  if (!actor || !actor.active) throw appError('SESSION_REQUIRED', 401);
  const seenAt = actor.session_last_seen ? new Date(String(actor.session_last_seen).replace(' ', 'T') + '+07:00').getTime() : 0;
  if (!seenAt || Date.now() - seenAt > config.sessionIdleSeconds * 1000) {
    await pool.execute('UPDATE app_users SET session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE id=? AND session_token_hash=?', [actor.id, tokenHash]);
    throw appError('SESSION_REQUIRED', 401);
  }
  if (touch) await pool.execute('UPDATE app_users SET session_last_seen=NOW(3) WHERE id=? AND session_token_hash=?', [actor.id, tokenHash]);
  return { ...actor, tokenHash };
}
function requireAdmin(actor) { assert(actor.role === 'admin', 'FORBIDDEN', 403); }
async function logout(actor) {
  await pool.execute('UPDATE app_users SET session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE id=? AND session_token_hash=?', [actor.id, actor.tokenHash]);
}

module.exports = { login, actorFromRequest, requireAdmin, logout };
