const fs = require('node:fs');
const path = require('node:path');
const { config, pool, appError, assert, newId } = require('./core.cjs');
const { requireOperator,requirePermission } = require('./permissions.cjs');

const types = {
  jpeg: { mime: 'image/jpeg', ext: 'jpg' },
  png: { mime: 'image/png', ext: 'png' },
  webp: { mime: 'image/webp', ext: 'webp' },
};
function sniff(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return types.jpeg;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return types.png;
  if (buffer.length >= 12 && buffer.subarray(0,4).toString() === 'RIFF' && buffer.subarray(8,12).toString() === 'WEBP') return types.webp;
  throw appError('VALIDATION_ERROR', 415);
}
function resolveImage(relative) {
  const normalized = String(relative || '').replaceAll('\\', '/');
  assert(/^products\/\d{4}\/\d{2}\/[0-9a-f-]+\.(jpg|png|webp)$/.test(normalized));
  const root = path.resolve(config.dataDir, 'uploads');
  const target = path.resolve(root, normalized);
  assert(target.startsWith(root + path.sep));
  return target;
}
async function saveImage(actor, file) {
  requirePermission(actor,'manage_products');
  requireOperator(actor);
  assert(file && file.buffer && file.size > 0 && file.size <= 5 * 1024 * 1024);
  const type = sniff(file.buffer);
  assert(file.mimetype === type.mime);
  const now = new Date();
  const year = String(now.getFullYear()), month = String(now.getMonth() + 1).padStart(2, '0');
  const relative = `products/${year}/${month}/${newId()}.${type.ext}`;
  const target = resolveImage(relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, file.buffer, { flag: 'wx' });
  return { path: relative };
}
async function deleteImage(actor, relative) {
  requirePermission(actor,'manage_products');
  requireOperator(actor);
  const [[usage]] = await pool.execute('SELECT COUNT(*) count FROM products WHERE image_path=? AND deleted_at IS NULL', [relative]);
  assert(!Number(usage.count), 'PRODUCT_IN_USE', 409);
  try { fs.unlinkSync(resolveImage(relative)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return { ok: true };
}
function sendFile(res, relative) {
  const target = resolveImage(relative);
  const extension = path.extname(target).slice(1);
  const mime = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.sendFile(target);
}
async function sendProductImage(res, productId) {
  const [[product]] = await pool.execute('SELECT image_path FROM products WHERE id=? AND image_path IS NOT NULL', [productId]);
  if (!product) throw appError('PRODUCT_NOT_FOUND', 404);
  sendFile(res, product.image_path);
}
module.exports = { saveImage, deleteImage, sendFile, sendProductImage, sniff, resolveImage };
