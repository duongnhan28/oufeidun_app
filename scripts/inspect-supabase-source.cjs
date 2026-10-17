const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

function parseEnv(file) {
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8').split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        let value = line.slice(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        return [line.slice(0, index), value];
      }),
  );
}

async function main() {
  const envFile = process.env.OUFEIDUN_SUPABASE_ENV || path.resolve('E:/mhpGroup/.env.supabase.local');
  const env = parseEnv(envFile);
  const sourceSchema = process.env.OUFEIDUN_SOURCE_SCHEMA || 'app_ban_hang';
  const connectionString = String(env.SUPABASE_MIGRATION_URL || env.DATABASE_URL || '').replace(/[?&]sslmode=[^&]+/, '');
  if (!connectionString) throw new Error('Thiếu SUPABASE_MIGRATION_URL.');
  const caFile = process.env.OUFEIDUN_SUPABASE_CA || path.resolve('.local/supabase-root-2021.crt');
  const ca = String(env.DATABASE_SSL_CA || '').replace(/\\n/g, '\n') || (fs.existsSync(caFile) ? fs.readFileSync(caFile, 'utf8') : undefined);
  const client = new Client({ connectionString, ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true } });
  await client.connect();
  try {
    const identity = await client.query('select current_database() database, current_user username');
    const tables = await client.query(`
      select table_schema, table_name
      from information_schema.tables
      where table_schema=$1 and table_type='BASE TABLE'
      order by table_schema, table_name
    `, [sourceSchema]);
    const result = [];
    for (const { table_schema, table_name } of tables.rows) {
      const safeSchema = table_schema.replace(/"/g, '""');
      const safeTable = table_name.replace(/"/g, '""');
      const count = await client.query(`select count(*)::int count from "${safeSchema}"."${safeTable}"`);
      const columns = await client.query(`
        select column_name, data_type, is_nullable
        from information_schema.columns
        where table_schema=$1 and table_name=$2
        order by ordinal_position
      `, [table_schema, table_name]);
      result.push({ schema: table_schema, table: table_name, count: count.rows[0].count, columns: columns.rows });
    }
    const imageAudit = process.env.OUFEIDUN_IMAGE_AUDIT === '1' ? {
      buckets: (await client.query('select id,name,public from storage.buckets order by id')).rows,
      objects: (await client.query('select bucket_id,name,metadata from storage.objects order by bucket_id,name')).rows,
      product_paths: (await client.query("select id,sku,image_path from app_ban_hang.products where image_path is not null order by sku")).rows,
      policies: (await client.query("select policyname,roles,qual from pg_policies where schemaname='storage' and tablename='objects' order by policyname")).rows,
      access_function: (await client.query("select pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='can_access_app_ban_hang_images'")).rows,
      active_sessions: (await client.query("select user_id,device_id,claimed_at,last_seen_at,now()-last_seen_at age from app_ban_hang.active_sessions order by last_seen_at desc")).rows,
    } : undefined;
    console.log(JSON.stringify({ connection: identity.rows[0], tables: result, image_audit: imageAudit }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Không kiểm kê được Supabase: ${error.message}`);
  process.exitCode = 1;
});
