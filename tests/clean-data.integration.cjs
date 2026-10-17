const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mysql=require('../server/node_modules/mysql2/promise');
const {inspect,clean}=require('../deployment/customer/server/scripts/clean-database.cjs');
const file=path.resolve('server/.env.test.local');
test('clean data: preview, rollback, unknown schema guard, retain all accounts and migrations, repeat safely',{skip:!fs.existsSync(file)},async()=>{
 const cfg={};for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const match=line.match(/^([^#=]+)=(.*)$/);if(match)cfg[match[1].trim()]=match[2].trim()}
 assert.match(cfg.MYSQL_DATABASE,/test/i,'must run only against explicitly named test database');
 const connection=await mysql.createConnection({host:cfg.MYSQL_HOST,port:Number(cfg.MYSQL_PORT),user:cfg.MYSQL_USER,password:cfg.MYSQL_PASSWORD,database:cfg.MYSQL_DATABASE});
 try{
  const id=crypto.randomUUID();await connection.execute('INSERT INTO glass_brands(id,name) VALUES (?,?)',[id,'Clean fixture '+id]);
  const [users]=await connection.query('SELECT * FROM app_users ORDER BY id');
  const [migrations]=await connection.query('SELECT * FROM schema_migrations ORDER BY version');
  const before=await inspect(connection);assert.ok(before.counts.glass_brands>0);
  assert.deepEqual(await inspect(connection),before,'preview must not change data');
  assert.ok(!JSON.stringify(before).includes('password_hash'));
  await assert.rejects(clean(connection,{beforeCommit:async()=>{throw Error('INJECTED_FAILURE')}}),/INJECTED_FAILURE/);
  assert.deepEqual(await inspect(connection),before,'failed cleanup must roll back every deletion');
  const [[flags]]=await connection.query('SELECT @@FOREIGN_KEY_CHECKS enabled');assert.equal(flags.enabled,1);
  await connection.query('CREATE TABLE clean_guard_test (id INT) ENGINE=InnoDB');
  try{await assert.rejects(clean(connection),/UNKNOWN_DATABASE_SCHEMA/)}finally{await connection.query('DROP TABLE clean_guard_test')}
  assert.deepEqual(await inspect(connection),before);
  const result=await clean(connection);assert.equal(result.accounts,users.length);
  const after=await inspect(connection);for(const table of after.tables)assert.equal(after.counts[table],0);
  assert.deepEqual((await connection.query('SELECT * FROM app_users ORDER BY id'))[0],users,'all account fields including passwords, roles and sessions must remain identical');
  assert.deepEqual((await connection.query('SELECT * FROM schema_migrations ORDER BY version'))[0],migrations);
  await clean(connection);assert.deepEqual(await inspect(connection),after);
 }finally{await connection.end()}
});
