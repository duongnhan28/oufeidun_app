const { pool, newId, transaction, audit } = require('./core.cjs');
const {resolveSku,reserveSku}=require('./sku-names.cjs');
const samples = [
  ['IP15-TR','Kính trong iPhone 15','clear',['iPhone 15','iPhone 16'],'Apple',25000,22000,10000,15],
  ['IP15-CNT','Kính chống nhìn trộm iPhone 15','privacy',['iPhone 15','iPhone 16'],'Apple',45000,40000,20000,15],
  ['SAM-A12','Kính trong Samsung A12','clear',['Samsung A12','Samsung A13','Samsung A14','Samsung A15'],'Samsung',25000,22000,10000,15],
  ['OP-A78','Kính trong OPPO A78','clear',['OPPO A78'],'OPPO',20000,18000,8000,15],
];
async function seed() {
  await transaction(async db => {
    const [[admin]] = await db.query("SELECT id FROM app_users WHERE role='admin' AND deleted_at IS NULL LIMIT 1 FOR UPDATE");
    if (!admin) throw new Error('Chưa có tài khoản admin. Hãy chạy setup-local-server.ps1 trước.');
    for (const [sku,name,type,models,brand,retail,wholesale,cost,stock] of samples) {
      const existing = await resolveSku(db,sku);
      if (existing) continue;
      const id = newId();
      await db.execute(`INSERT INTO products(id,sku,name,glass_type,models,brand,sale_price,wholesale_price,fixed_cost,on_hand,stock_version)
        VALUES (?,?,?,?,CAST(? AS JSON),?,?,?,?,?,2)`, [id,sku,name,type,JSON.stringify(models),brand,retail,wholesale,cost,stock]);
      await reserveSku(db,id,sku);
      const documentId=newId(), lineId=newId();
      await db.execute("INSERT INTO inventory_documents(id,type,reason,created_by) VALUES (?,'opening','Dữ liệu mẫu ban đầu',?)",[documentId,admin.id]);
      await db.execute('INSERT INTO inventory_document_items(id,document_id,product_id,quantity_delta,fixed_cost_snapshot,sku_snapshot,name_snapshot) VALUES (?,?,?,?,?,?,?)',[lineId,documentId,id,stock,cost,sku,name]);
      await db.execute("INSERT INTO inventory_movements(id,product_id,movement_type,quantity_delta,balance_after,product_version_after,inventory_document_item_id,actor_id) VALUES (?,?,'opening',?,?,?,?,?)",[newId(),id,stock,stock,2,lineId,admin.id]);
    }
    await audit(db, admin.id, 'sample.seed', 'Dữ liệu mẫu local');
  });
}
if(require.main===module)seed().then(()=>{console.log('Đã thêm dữ liệu mẫu local.');return pool.end();}).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={seed};
