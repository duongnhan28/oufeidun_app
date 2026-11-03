const crypto = require('node:crypto');
const { pool, config, appError, assert, cleanText, hashToken, passwordMatches, publicUser, transaction, audit } = require('./core.cjs');

function sessionTime(value) {
  return value ? new Date(String(value).replace(' ', 'T') + '+07:00').getTime() : 0;
}
function sessionValid(user) {
  const expiresAt = sessionTime(user.session_expires_at);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

async function login(username, password, deviceId) {
  const loginName = cleanText(username, 100, true).toLowerCase();
  const device = cleanText(deviceId, 100, true);
  return transaction(async db => {
    const [[user]] = await db.execute('SELECT * FROM app_users WHERE login_name=? AND deleted_at IS NULL FOR UPDATE', [loginName]);
    if (!user || !passwordMatches(String(password || ''), user.password_hash)) throw appError('INVALID_CREDENTIALS', 401);
    if (!user.active) throw appError('ACCOUNT_DISABLED', 403);
    const freshSession = user.session_token_hash && sessionValid(user) && user.session_device_id && user.session_device_id !== device && user.session_last_seen &&
      Date.now() - sessionTime(user.session_last_seen) < config.sessionIdleSeconds * 1000;
    if (freshSession) throw appError('SESSION_ALREADY_ACTIVE', 409);
    const token = crypto.randomBytes(32).toString('base64url');
    await db.execute('UPDATE app_users SET session_device_id=?,session_token_hash=?,session_last_seen=NOW(3),session_expires_at=DATE_ADD(NOW(3),INTERVAL ? SECOND) WHERE id=?', [device, hashToken(token), config.sessionMaxSeconds, user.id]);
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
  // Presence timeout only controls claiming a session on another device.
  // A sleeping/offline client may resume its token until its absolute deadline.
  if (!sessionValid(actor)) {
    await pool.execute('UPDATE app_users SET session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL,session_expires_at=NULL WHERE id=? AND session_token_hash=?', [actor.id, tokenHash]);
    throw appError('SESSION_REQUIRED', 401);
  }
  if (touch) {
    const [result] = await pool.execute('UPDATE app_users SET session_last_seen=NOW(3) WHERE id=? AND session_token_hash=? AND active=TRUE AND deleted_at IS NULL AND session_expires_at>NOW(3)', [actor.id, tokenHash]);
    if (!result.affectedRows) throw appError('SESSION_REQUIRED', 401);
  }
  return { ...actor, tokenHash };
}
function requireAdmin(actor) { assert(actor.role === 'admin', 'FORBIDDEN', 403); }
async function logout(actor) {
  await pool.execute('UPDATE app_users SET session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL,session_expires_at=NULL WHERE id=? AND session_token_hash=?', [actor.id, actor.tokenHash]);
}

module.exports = { login, actorFromRequest, requireAdmin, logout };
