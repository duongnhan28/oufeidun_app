const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const serverRoot = path.resolve(__dirname, '..');
dotenv.config({ path: process.env.OUFEIDUN_SERVER_ENV || path.join(serverRoot, '.env.local') });

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`CONFIG_REQUIRED:${name}`);
  return value;
}

const sessionMaxSeconds = Number(process.env.SESSION_MAX_SECONDS || 43200);
if (!Number.isSafeInteger(sessionMaxSeconds) || sessionMaxSeconds < 300 || sessionMaxSeconds > 86400)
  throw new Error('CONFIG_REQUIRED:SESSION_MAX_SECONDS');

const config = {
  host: process.env.OUFEIDUN_HOST || '127.0.0.1',
  port: Number(process.env.OUFEIDUN_PORT || 8787),
  dataDir: path.resolve(process.env.OUFEIDUN_DATA_DIR || (process.env.OUFEIDUN_SERVER_ENV ? path.join(path.dirname(process.env.OUFEIDUN_SERVER_ENV), '..') : path.join(serverRoot, '..', 'OufeidunServerData'))),
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE || 'oufeidun_local',
    user: required('MYSQL_USER'),
    password: required('MYSQL_PASSWORD'),
  },
  admin: {
    login: process.env.ADMIN_LOGIN || 'admin',
    displayName: process.env.ADMIN_DISPLAY_NAME || 'Admin',
    password: process.env.ADMIN_PASSWORD || '',
  },
  sessionIdleSeconds: Math.max(60, Number(process.env.SESSION_IDLE_SECONDS || 90)),
  sessionMaxSeconds,
  allowedOrigins: new Set(String(process.env.OUFEIDUN_ALLOWED_ORIGINS || 'shop://app,http://127.0.0.1:5178').split(',').map(v => v.trim()).filter(Boolean)),
};

for (const directory of ['uploads/products', 'backups/daily', 'backups/weekly', 'logs', 'temp'])
  fs.mkdirSync(path.join(config.dataDir, directory), { recursive: true });

const pool = mysql.createPool({
  ...config.mysql,
  waitForConnections: true,
  connectionLimit: 12,
  maxIdle: 12,
  idleTimeout: 60000,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+07:00',
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
});

function appError(code, status = 400) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
}
function assert(condition, code = 'VALIDATION_ERROR', status = 400) {
  if (!condition) throw appError(code, status);
}
function uuid(value) {
  const text = String(value || '');
  assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text));
  return text.toLowerCase();
}
function newId() { return crypto.randomUUID(); }
function cleanText(value, max, requiredValue = false) {
  const text = String(value ?? '').trim();
  assert((!requiredValue || text.length > 0) && text.length <= max);
  return text;
}
function moneyValue(value) {
  const text = String(value ?? '');
  assert(/^\d{1,15}$/.test(text));
  return text;
}
function positiveInt(value, allowZero = false) {
  const number = Number(value);
  assert(Number.isSafeInteger(number) && (allowZero ? number >= 0 : number > 0) && number <= 1000000);
  return number;
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function passwordHash(password) {
  assert(typeof password === 'string' && password.length >= 12 && password.length <= 200, 'VALIDATION_ERROR');
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}
function passwordMatches(password, stored) {
  try {
    const [kind, saltText, hashText] = String(stored).split('$');
    if (kind !== 'scrypt') return false;
    const expected = Buffer.from(hashText, 'base64url');
    const actual = crypto.scryptSync(String(password), Buffer.from(saltText, 'base64url'), expected.length);
    return crypto.timingSafeEqual(expected, actual);
  } catch { return false; }
}
async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
// All parts of a screen/export must represent the same committed state even
// when other workstations post sales or payments between its SELECTs.
async function readSnapshot(work) {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
async function audit(db, actorId, action, detail = '') {
  await db.execute('INSERT INTO audit_logs(id,actor_id,action,detail) VALUES (?,?,?,?)', [newId(), actorId, action, String(detail)]);
}
async function moveStock(db, productId, delta, kind, actorId, refs = {}) {
  if (!delta) return;
  const [[product]] = await db.execute('SELECT id,on_hand,stock_version FROM products WHERE id=? FOR UPDATE', [productId]);
  assert(product, 'PRODUCT_NOT_FOUND', 404);
  const balance = Number(product.on_hand) + Number(delta);
  assert(balance >= 0, 'INSUFFICIENT_STOCK', 409);
  const stockVersion = Number(product.stock_version) + 1;
  await db.execute('UPDATE products SET on_hand=?,stock_version=?,version=version+1 WHERE id=?', [balance, stockVersion, productId]);
  await db.execute(`INSERT INTO inventory_movements
    (id,product_id,movement_type,quantity_delta,balance_after,product_version_after,inventory_document_item_id,sale_order_item_id,return_item_id,actor_id)
    VALUES (?,?,?,?,?,?,?,?,?,?)`, [newId(), productId, kind, delta, balance, stockVersion, refs.doc || null, refs.sale || null, refs.ret || null, actorId]);
}
function jsonArray(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value || '[]'); } catch { return []; }
}
function publicUser(row) { return { id: row.id, display_name: row.display_name, role: row.role, active: Boolean(row.active), permissions:require('./capabilities.cjs').permissions(row),permissions_version:Number(row.permissions_version||1) }; }

module.exports = { config, pool, appError, assert, uuid, newId, cleanText, moneyValue, positiveInt, canonical, hashToken, passwordHash, passwordMatches, transaction, readSnapshot, audit, moveStock, jsonArray, publicUser };
