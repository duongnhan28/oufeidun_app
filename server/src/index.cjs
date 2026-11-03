const express = require('express');
const multer = require('multer');
const { config, pool, appError } = require('./core.cjs');
const { migrate } = require('./migrate.cjs');
const { login, actorFromRequest, logout } = require('./auth.cjs');
const { workspace, history } = require('./workspace.cjs');
const { mutate } = require('./mutations.cjs');
const { saveOrderFeatures, saveCustomer, saveOrderBusiness, setWholesalePrice, setBulkPrice, deleteProduct, manageStaff } = require('./services.cjs');
const { report } = require('./reports.cjs');
const { saveImage, deleteImage, sendFile, sendProductImage } = require('./images.cjs');
const { lookup } = require('./lookup.cjs');

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const origin = req.headers.origin;
  if (origin && config.allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(origin && config.allowedOrigins.has(origin) ? 204 : 403);
  next();
});
app.use(express.json({ limit: '1mb', strict: true }));

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const auth = asyncRoute(async (req, _res, next) => { req.actor = await actorFromRequest(req); next(); });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2 } });
const attempts = new Map();
function loginKey(req) { return req.ip || req.socket.remoteAddress || 'local'; }
function checkLoginLimit(req) {
  const key = loginKey(req);
  const now = Date.now();
  const previous = (attempts.get(key) || []).filter(time => now - time < 60_000);
  if (previous.length >= 10) throw appError('TOO_MANY_REQUESTS', 429);
  attempts.set(key, previous);
}
function recordLoginFailure(req) { const key = loginKey(req); attempts.set(key, [...(attempts.get(key) || []), Date.now()]); }
function clearLoginFailures(req) { attempts.delete(loginKey(req)); }

app.get('/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, service: 'oufeidun-local-api', version: require('../package.json').version, discovery: Boolean(app.locals.lanDiscovery) });
}));
app.get('/api/glass-lookup', asyncRoute(async (req, res) => res.json(await lookup(req.query.q, req.query.limit))));
app.get('/api/images/:id', asyncRoute(async (req, res) => sendProductImage(res, req.params.id)));

const api = express.Router();
api.post('/auth/login', asyncRoute(async (req, res) => {
  checkLoginLimit(req);
  try {
    const result = await login(req.body.username, req.body.password, req.body.device_id);
    clearLoginFailures(req);
    res.json(result);
  } catch (error) {
    if (error.code === 'INVALID_CREDENTIALS') recordLoginFailure(req);
    throw error;
  }
}));
api.post('/session/touch', auth, asyncRoute(async (_req, res) => res.json({ ok: true })));
api.post('/auth/logout', auth, asyncRoute(async (req, res) => { await logout(req.actor); res.json({ ok: true }); }));
api.get('/workspace', auth, asyncRoute(async (req, res) => res.json(await workspace(req.actor))));
api.post('/stock/forecast', auth, asyncRoute(async (req,res)=>res.json(await require('./stock-forecast.cjs').stockForecast(req.actor,req.body))));
api.post('/query', auth, asyncRoute(async (req, res) => {
  if (req.body.action !== 'history') throw appError('VALIDATION_ERROR');
  res.json(await history(req.actor, req.body));
}));
api.post('/mutations', auth, asyncRoute(async (req, res) => res.json(await mutate(req.actor, req.body))));
api.post('/orders/features', auth, asyncRoute(async (req, res) => res.json(await saveOrderFeatures(req.actor, req.body))));
api.post('/orders/business', auth, asyncRoute(async (req, res) => res.json(await saveOrderBusiness(req.actor, req.body))));
api.post('/customers', auth, asyncRoute(async (req, res) => res.json(await saveCustomer(req.actor, req.body))));
api.post('/products/wholesale-price', auth, asyncRoute(async (req, res) => res.json(await setWholesalePrice(req.actor, req.body))));
api.post('/products/bulk-price', auth, asyncRoute(async (req, res) => res.json(await setBulkPrice(req.actor, req.body))));
api.post('/products/delete', auth, asyncRoute(async (req, res) => res.json(await deleteProduct(req.actor, req.body))));
api.post('/staff', auth, asyncRoute(async (req, res) => res.json(await manageStaff(req.actor, req.body))));
api.post('/reports', auth, asyncRoute(async (req, res) => res.json(await report(req.actor, req.body))));
api.post('/reports/product', auth, asyncRoute(async (req, res) => res.json(await require('./product-report.cjs').productReport(req.actor,req.body))));
api.post('/images', auth, upload.single('image'), asyncRoute(async (req, res) => res.json(await saveImage(req.actor, req.file))));
api.get(/^\/images\/(.+)$/, auth, asyncRoute(async (req, res) => sendFile(res, decodeURIComponent(req.params[0]))));
api.delete(/^\/images\/(.+)$/, auth, asyncRoute(async (req, res) => res.json(await deleteImage(req.actor, decodeURIComponent(req.params[0])))));
app.use('/api/app/v1', api);

app.use((error, _req, res, _next) => {
  let code = error.code || error.message || 'INTERNAL_ERROR';
  let status = error.status || 500;
  if (error instanceof multer.MulterError) { code = error.code === 'LIMIT_FILE_SIZE' ? 'PAYLOAD_TOO_LARGE' : 'VALIDATION_ERROR'; status = 400; }
  if (error.code === 'ER_DUP_ENTRY') { code = 'DUPLICATE_VALUE'; status = 409; }
  if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') { code = 'VALIDATION_ERROR'; status = 409; }
  if (status >= 500) console.error(new Date().toISOString(), error);
  res.status(status).json({ error: String(code).split(':')[0] });
});

async function start() {
  await migrate();
  const server = app.listen(config.port, config.host, () => console.log(`Oufeidun Local API: http://${config.host}:${config.port}`));
  let discovery;
  const identityFile=require('node:path').join(config.dataDir,'config','discovery-identity.json');
  if(require('node:fs').existsSync(identityFile)){
    const identity=JSON.parse(require('node:fs').readFileSync(identityFile,'utf8').replace(/^\uFEFF/,''));
    discovery=require('./discovery.cjs').startDiscovery(identity);
    discovery.on('listening',()=>{app.locals.lanDiscovery=true});
    discovery.on('error',()=>{app.locals.lanDiscovery=false});
  }
  const shutdown = async () => { if(discovery){try{discovery.close()}catch{}}server.close(); await pool.end(); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  return server;
}
if (require.main === module) start().catch(error => { console.error(error); process.exit(1); });
module.exports = { app, start };
