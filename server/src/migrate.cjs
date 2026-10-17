const fs = require('node:fs');
const path = require('node:path');
const { pool, config, newId, passwordHash } = require('./core.cjs');

async function migrate() {
  const migrationDir = path.resolve(__dirname, '../mysql');
  const files = fs.readdirSync(migrationDir).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  const [tables] = await pool.query("SELECT COUNT(*) count FROM information_schema.tables WHERE table_schema=? AND table_name='schema_migrations'", [config.mysql.database]);
  const applied = new Set();
  if (Number(tables[0].count)) {
    const [versions] = await pool.query('SELECT version FROM schema_migrations');
    for (const row of versions) applied.add(row.version);
  }
  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) continue;
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    const connection = await pool.getConnection();
    try {
      for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map(s => s.trim()).filter(Boolean)) {
        try { await connection.query(statement); }
        catch (error) {
          if (['ER_DUP_FIELDNAME','ER_DUP_KEYNAME'].includes(error.code)) continue;
          if(file==='007_sale_gift_lines.sql' && statement==='ALTER TABLE sales_order_items DROP INDEX sales_order_items_order_product' && error.code==='ER_CANT_DROP_FIELD_OR_KEY'){
            const [indexes]=await connection.query("SHOW INDEX FROM sales_order_items WHERE Key_name='sales_order_items_order_product_kind'");
            if(indexes.length===3 && indexes.every(row=>Number(row.Non_unique)===0))continue;
          }
          throw error;
        }
      }
    } finally { connection.release(); }
  }
  const [foreignKeys] = await pool.query("SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? AND CONSTRAINT_NAME='sales_orders_exchange_return_fk'", [config.mysql.database]);
  if (!foreignKeys.length)
    await pool.query('ALTER TABLE sales_orders ADD CONSTRAINT sales_orders_exchange_return_fk FOREIGN KEY (exchange_return_id) REFERENCES sales_returns(id)');
  if (config.admin.password) {
    const [existing] = await pool.execute('SELECT id FROM app_users WHERE login_name=?', [config.admin.login.toLowerCase()]);
    if (!existing.length) {
      await pool.execute(`INSERT INTO app_users(id,login_name,display_name,password_hash,role,active)
        VALUES (?,?,?,?,\'admin\',TRUE)`, [newId(), config.admin.login.toLowerCase(), config.admin.displayName, passwordHash(config.admin.password)]);
    }
  }
}

if (require.main === module) migrate().then(() => { console.log('MySQL migration hoàn tất.'); return pool.end(); }).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };
