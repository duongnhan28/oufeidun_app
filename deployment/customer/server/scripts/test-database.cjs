const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
async function main(){
  const req=createRequire(path.join(path.resolve(process.argv[2]),'package.json'));
  const mysql=req('mysql2/promise');
  const cfg=Object.fromEntries(fs.readFileSync(process.env.OUFEIDUN_SERVER_ENV,'utf8').split(/\r?\n/).filter(l=>/^[^#=]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}));
  const db=await mysql.createConnection({host:cfg.MYSQL_HOST,port:Number(cfg.MYSQL_PORT||3306),user:cfg.MYSQL_USER,password:cfg.MYSQL_PASSWORD,database:cfg.MYSQL_DATABASE,connectTimeout:5000});
  try{await db.query('SELECT 1 FROM app_users LIMIT 1');console.log('MySQL connection OK');}finally{await db.end()}
}
main().catch(e=>{console.error('MySQL check failed: '+(e.code||'CONNECTION_ERROR'));process.exitCode=1});
