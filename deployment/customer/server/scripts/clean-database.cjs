const fs=require('node:fs');
const path=require('node:path');
const TABLES=['mutation_requests','audit_logs','inventory_movements','inventory_document_items','inventory_documents','sales_payments','sales_return_items','order_delivery_items','order_delivery_batches','sales_order_items','customer_product_prices','sales_returns','sales_orders','customers','products','glass_brands'];
const KEEP=['app_users','schema_migrations'];
async function inspect(connection){
 const [rows]=await connection.query('SELECT TABLE_NAME name,ENGINE engine FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE=\'BASE TABLE\'');
 const names=rows.map(row=>row.name);
 if(KEEP.some(table=>!names.includes(table))||names.some(table=>!TABLES.includes(table)&&!KEEP.includes(table)))throw Error('UNKNOWN_DATABASE_SCHEMA');
 if(rows.some(row=>row.engine!=='InnoDB'))throw Error('TRANSACTION_ENGINE_REQUIRED');
 const [[admin]]=await connection.query("SELECT COUNT(*) count FROM app_users WHERE role='admin' AND active=TRUE AND deleted_at IS NULL");
 if(!Number(admin.count))throw Error('ACTIVE_ADMIN_REQUIRED');
 const [triggers]=await connection.query('SELECT TRIGGER_NAME FROM information_schema.triggers WHERE TRIGGER_SCHEMA=DATABASE()');
 if(triggers.length)throw Error('CUSTOM_TRIGGERS_REQUIRE_REVIEW');
 const [external]=await connection.query('SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE (TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_SCHEMA<>DATABASE()) OR (TABLE_SCHEMA<>DATABASE() AND REFERENCED_TABLE_SCHEMA=DATABASE())');
 if(external.length)throw Error('EXTERNAL_FOREIGN_KEY_REQUIRE_REVIEW');
 const counts={};for(const table of [...TABLES.filter(table=>names.includes(table)),...KEEP]){
  const [[row]]=await connection.query(`SELECT COUNT(*) count FROM \`${table}\``);counts[table]=Number(row.count);
 }
 return {tables:TABLES.filter(table=>names.includes(table)),counts};
}
async function clean(connection,{beforeCommit=async()=>{}}={}){
 const state=await inspect(connection);
 const [usersBefore]=await connection.query('SELECT * FROM app_users ORDER BY id');
 const [migrationsBefore]=await connection.query('SELECT * FROM schema_migrations ORDER BY version');
 await connection.query('SET FOREIGN_KEY_CHECKS=0');
 try{
  await connection.beginTransaction();
  for(const table of state.tables)await connection.query(`DELETE FROM \`${table}\``);
  const [usersAfter]=await connection.query('SELECT * FROM app_users ORDER BY id');
  const [migrationsAfter]=await connection.query('SELECT * FROM schema_migrations ORDER BY version');
  if(JSON.stringify(usersAfter)!==JSON.stringify(usersBefore)||JSON.stringify(migrationsAfter)!==JSON.stringify(migrationsBefore))throw Error('PRESERVED_DATA_CHANGED');
  for(const table of state.tables){const [[row]]=await connection.query(`SELECT COUNT(*) count FROM \`${table}\``);if(Number(row.count))throw Error('CLEAN_VERIFICATION_FAILED');}
  await beforeCommit();await connection.commit();
  return {removed:state.counts,accounts:usersBefore.length};
 }catch(error){await connection.rollback();throw error}finally{await connection.query('SET FOREIGN_KEY_CHECKS=1');}
}
async function cli(){
 const [action,appDir,envFile]=process.argv.slice(2);
 if(!['preview','apply'].includes(action))throw Error('INVALID_ACTION');
 const cfg={};for(const line of fs.readFileSync(envFile,'utf8').split(/\r?\n/)){const match=line.match(/^([^#=]+)=(.*)$/);if(match)cfg[match[1].trim()]=match[2].trim()}
 const mysql=require(path.join(path.resolve(appDir),'node_modules','mysql2','promise'));
 const connection=await mysql.createConnection({host:cfg.MYSQL_HOST||'127.0.0.1',port:Number(cfg.MYSQL_PORT||3306),user:cfg.MYSQL_USER,password:cfg.MYSQL_PASSWORD,database:cfg.MYSQL_DATABASE});
 try{console.log(JSON.stringify(action==='preview'?await inspect(connection):await clean(connection)))}finally{await connection.end()}
}
if(require.main===module)cli().catch(error=>{console.error('CLEAN_FAILED:'+String(error.code||error.message).replace(/[^A-Z0-9_]/g,'_'));process.exitCode=1});
module.exports={TABLES,inspect,clean};
