const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
(async () => {
  const app=path.resolve(process.argv[2]);
  const envFile=path.resolve(process.argv[3]);
  const request=createRequire(path.join(app,'package.json'));
  const cfg=Object.fromEntries(fs.readFileSync(envFile,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/).filter(l=>/^[^#=]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));
  const db=await request('mysql2/promise').createConnection({host:cfg.MYSQL_HOST,port:Number(cfg.MYSQL_PORT||3306),user:cfg.MYSQL_USER,password:cfg.MYSQL_PASSWORD,database:cfg.MYSQL_DATABASE,connectTimeout:5000});
  try {
    await db.query('SELECT 1 FROM app_users LIMIT 1');
    const [[storage]]=await db.query('SELECT @@datadir AS mysqlDataDir');
    const [[size]]=await db.query('SELECT COALESCE(SUM(data_length+index_length),0) bytes FROM information_schema.tables WHERE table_schema=DATABASE()');
    const [[image]]=await db.query('SELECT id,image_path FROM products WHERE image_path IS NOT NULL AND deleted_at IS NULL LIMIT 1');
    console.log(JSON.stringify({mysqlDataDir:storage.mysqlDataDir,dbBytes:Number(size.bytes),imageId:image?.id||null,imagePath:image?.image_path||null}));
  } finally {await db.end()}
})().catch(e=>{console.error('DB check failed: '+(e.code||'CHECK_FAILED'));process.exitCode=1});
