const fs = require('node:fs');
const path = require('node:path');

const mode = process.argv[2];
const supported = new Set(['test-supabase', 'local-mysql', 'production-mysql']);
if (!supported.has(mode)) {
  console.error('Profile không hợp lệ. Chỉ chấp nhận test-supabase, local-mysql hoặc production-mysql.');
  process.exit(1);
}
function parse(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => { const index = line.indexOf('='); return [line.slice(0,index).trim(),line.slice(index+1).trim().replace(/^['"]|['"]$/g,'')]; }));
}
const root = path.resolve(__dirname, '..');
const files = ['.env','.env.local',`.env.${mode}`,`.env.${mode}.local`];
const env = Object.assign({}, ...files.map(file => parse(path.join(root,file))), process.env);
const errors = [];
function validHttps(value) { try { return new URL(value).protocol === 'https:'; } catch { return false; } }
function validLocalOrHttps(value) {
  try { const url = new URL(value); return url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1','localhost'].includes(url.hostname)); }
  catch { return false; }
}
if (env.VITE_DEMO_MODE !== 'false') errors.push('VITE_DEMO_MODE phải bằng false.');
if (mode === 'test-supabase') {
  if (env.VITE_SERVER_ENV !== 'test') errors.push('VITE_SERVER_ENV phải bằng test.');
  if (env.VITE_DATA_BACKEND !== 'supabase') errors.push('TEST phải dùng VITE_DATA_BACKEND=supabase.');
  if (!validHttps(env.VITE_SUPABASE_URL || '') || /YOUR_|PROJECT/i.test(env.VITE_SUPABASE_URL || '')) errors.push('Thiếu VITE_SUPABASE_URL của project test.');
  if (!env.VITE_SUPABASE_PUBLISHABLE_KEY || /YOUR_/i.test(env.VITE_SUPABASE_PUBLISHABLE_KEY)) errors.push('Thiếu VITE_SUPABASE_PUBLISHABLE_KEY của project test.');
} else {
  const expectedEnvironment = mode === 'local-mysql' ? 'local' : 'production';
  if (env.VITE_SERVER_ENV !== expectedEnvironment) errors.push(`VITE_SERVER_ENV phải bằng ${expectedEnvironment}.`);
  if (env.VITE_DATA_BACKEND !== 'api') errors.push('Profile MySQL phải dùng VITE_DATA_BACKEND=api.');
  const validUrl = mode === 'local-mysql' ? validLocalOrHttps : validHttps;
  if (!validUrl(env.VITE_API_BASE_URL || '') || /YOUR_|ten-mien-cua-ban/i.test(env.VITE_API_BASE_URL || '')) errors.push('Thiếu VITE_API_BASE_URL hợp lệ.');
  if (!validUrl(env.VITE_GLASS_LOOKUP_API_URL || '') || /YOUR_|ten-mien-cua-ban/i.test(env.VITE_GLASS_LOOKUP_API_URL || '')) errors.push('Thiếu VITE_GLASS_LOOKUP_API_URL hợp lệ.');
  if (validUrl(env.VITE_API_BASE_URL || '') && validUrl(env.VITE_GLASS_LOOKUP_API_URL || '')) {
    const api = new URL(env.VITE_API_BASE_URL), lookup = new URL(env.VITE_GLASS_LOOKUP_API_URL);
    if (mode === 'production-mysql' && api.origin !== lookup.origin) errors.push('PRODUCTION yêu cầu API app và API tra cứu cùng origin.');
    if (mode === 'local-mysql' && api.origin !== lookup.origin && lookup.protocol !== 'https:') errors.push('API mã dùng chung bên ngoài phải dùng HTTPS.');
    if (!api.pathname.replace(/\/+$/,'').endsWith('/api/app/v1')) errors.push('VITE_API_BASE_URL phải kết thúc bằng /api/app/v1.');
    if (!lookup.pathname.replace(/\/+$/,'').endsWith('/api/glass-lookup')) errors.push('VITE_GLASS_LOOKUP_API_URL phải kết thúc bằng /api/glass-lookup.');
  }
}
if (errors.length) { console.error(`Cấu hình ${mode} chưa hợp lệ:\n- ${errors.join('\n- ')}`); process.exit(1); }
const target = mode === 'test-supabase' ? new URL(env.VITE_SUPABASE_URL).host : new URL(env.VITE_API_BASE_URL).host;
console.log(`Cấu hình hợp lệ: ${mode} → ${target}`);
