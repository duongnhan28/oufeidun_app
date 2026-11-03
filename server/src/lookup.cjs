const { pool, assert, jsonArray } = require('./core.cjs');

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}
async function lookup(query, limitValue) {
  const raw = String(query || '').trim();
  assert(raw.length >= 2 && raw.length <= 80);
  const limit = Math.min(50, Math.max(1, Number(limitValue || 20)));
  const [rows] = await pool.query(`SELECT id,sku,name,glass_type,models,image_path,(SELECT JSON_ARRAYAGG(n.sku) FROM product_sku_names n WHERE n.product_id=products.id AND BINARY n.sku<>BINARY products.sku) sku_aliases FROM products WHERE active=TRUE AND deleted_at IS NULL ORDER BY sku LIMIT 5000`);
  const needle = normalize(raw);
  return {
    query: raw,
    items: rows.map(row => {
      const models = jsonArray(row.models);
      const matched = models.filter(model => normalize(model).includes(needle));
      const sku = normalize(row.sku);
      const name = normalize(row.name);
      const aliasMatch=jsonArray(row.sku_aliases).some(alias=>normalize(alias).includes(needle));
      let score = aliasMatch?0:sku === needle ? 0 : sku.startsWith(needle) ? 1 : matched.some(model => normalize(model).startsWith(needle)) ? 2 : matched.length ? 3 : name.includes(needle) ? 4 : 99;
      return { row, models, matched, score };
    }).filter(item => item.score < 99).sort((a,b) => a.score - b.score || a.row.sku.localeCompare(b.row.sku)).slice(0, limit).map(({row,models,matched}) => ({
      id: row.id, sku: row.sku, name: row.name, glassTypes: [row.glass_type],
      images: row.image_path ? [`/api/images/${row.id}`] : [], matchedModels: matched,
      compatibleModels: [...matched, ...models.filter(model => !matched.includes(model))],
    })),
  };
}
module.exports = { lookup, normalize };
