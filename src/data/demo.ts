import { PGlite } from "@electric-sql/pglite";
import schema from "../../supabase/migrations/001_shop.sql?raw";
import brandsMigration from "../../supabase/migrations/003_glass_brands.sql?raw";
import partialFulfillmentMigration from "./demo-partial-fulfillment.sql?raw";
import excelCreateSkuMigration from "./demo-excel-create-sku.sql?raw";
import productImportMigration from "./demo-product-import.sql?raw";
import orderDetailsMigration from "./demo-order-details.sql?raw";
import catalogSalesMigration from "./demo-catalog-sales.sql?raw";
import sharedOrdersMigration from "./demo-shared-orders.sql?raw";
import orderLinePositionMigration from "./demo-order-line-position.sql?raw";
import sharedCategoryPriceMigration from "./demo-shared-category-price.sql?raw";
import sharedOperationsMigration from "./demo-shared-operations.sql?raw";
import editUnusedCodesMigration from "./demo-edit-unused-codes.sql?raw";
import customerIdentityMigration from "./demo-customer-identity.sql?raw";
import reportOrderDateMigration from "./demo-report-order-date.sql?raw";
import stockAdjustmentMigration from "./demo-stock-adjustment.sql?raw";
import productRenamesMigration from "./demo-product-renames.sql?raw";
import staffPermissionsMigration from './demo-staff-permissions.sql?raw';
import {permissionLabels,hasPermission} from '../lib/permissions';
import type {User} from '../types';
import type {ProductReportData} from './client';
export const demoUsers = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Chủ cửa hàng",
    role: "admin",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "Nguyễn An",
    role: "staff",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "Trần Bình",
    role: "staff",
  },
];
export const bootstrap = `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('app.user_id',true),'')::uuid $$;`;
export async function seed(db: Pick<PGlite, "query">) {
  for (const u of demoUsers) {
    await db.query("insert into auth.users values($1)", [u.id]);
    await db.query(
      "insert into app_private.app_users(id,display_name,role) values($1,$2,$3)",
      [u.id, u.name, u.role],
    );
  }
  const products = [
    [
      "IP15-TR",
      "Kính trong iPhone 15",
      "clear",
      "Apple",
      ["iPhone 15", "iPhone 16"],
      25000,
      10000,
      48,
    ],
    [
      "IP15-CNT",
      "Kính chống nhìn trộm",
      "privacy",
      "Apple",
      ["iPhone 15", "iPhone 16"],
      45000,
      20000,
      24,
    ],
    [
      "IP16P-TR",
      "Kính trong iPhone 16 Pro",
      "clear",
      "Apple",
      ["iPhone 16 Pro"],
      30000,
      12000,
      32,
    ],
    [
      "SS-A55",
      "Kính trong Samsung A55",
      "clear",
      "Samsung",
      ["Samsung A55"],
      25000,
      10000,
      18,
    ],
    [
      "SAM-A12",
      "Kính trong Samsung A12",
      "clear",
      "Samsung",
      ["Samsung A12", "Samsung A13", "Samsung A14", "Samsung A15"],
      25000,
      10000,
      20,
    ],
    [
      "OP-A78",
      "Kính trong OPPO A78",
      "clear",
      "OPPO",
      ["OPPO A78"],
      20000,
      8000,
      6,
    ],
    [
      "IP14PM",
      "Kính trong iPhone 14 Pro Max",
      "clear",
      "Apple",
      ["iPhone 14 Pro Max"],
      30000,
      12000,
      36,
    ],
  ];
  await db.query("select set_config('app.user_id',$1,false)", [
    demoUsers[0].id,
  ]);
  for (const [
    sku,
    name,
    glass_type,
    brand,
    models,
    sale_price,
    fixed_cost,
    qty,
  ] of products) {
    const r = await db.query<{ result: { id: string } }>(
      "select public.shop_write($1::jsonb) result",
      [
        JSON.stringify({
          action: "product",
          key: crypto.randomUUID(),
          sku,
          name,
          glass_type,
          brand,
          models,
          sale_price: String(sale_price),
          fixed_cost: String(fixed_cost),
          active: true,
        }),
      ],
    );
    await db.query("select public.shop_write($1::jsonb)", [
      JSON.stringify({
        action: "inventory",
        key: crypto.randomUUID(),
        type: "opening",
        reason: "Tồn mẫu ban đầu",
        items: [{ product_id: r.rows[0].result.id, quantity: qty }],
      }),
    ]);
  }
}
let dbPromise: Promise<PGlite> | undefined;
let queue: Promise<unknown> = Promise.resolve();
async function getDb() {
  if (!dbPromise)
    dbPromise = (async () => {
  const db = new PGlite("idb://kinh-demo-v9");
      await db.waitReady;
      const r = await db.query<{ exists: boolean }>(
        "select exists(select 1 from pg_namespace where nspname='app_private')",
      );
      if (!r.rows[0].exists) {
        await db.transaction(async (tx) => {
          await tx.exec(bootstrap);
          await tx.exec(schema);
          await seed(tx);
        });
      }
      const brands = await db.query<{ exists: boolean }>(
        "select exists(select 1 from pg_tables where schemaname='app_private' and tablename='glass_brands')",
      );
      if (!brands.rows[0].exists)
        await db.transaction(async (tx) => {
          await tx.exec(brandsMigration);
        });
      // Refresh the idempotent functions for existing demo databases too.
      await db.transaction(async (tx) => {
        await tx.exec(partialFulfillmentMigration);
        await tx.exec(excelCreateSkuMigration);
        await tx.exec(productImportMigration);
        await tx.exec(orderDetailsMigration);
        await tx.exec(catalogSalesMigration);
        await tx.exec(sharedOrdersMigration);
        await tx.exec(orderLinePositionMigration);
        await tx.exec(sharedCategoryPriceMigration);
        await tx.exec(sharedOperationsMigration);
        await tx.exec(editUnusedCodesMigration);
        await tx.exec(customerIdentityMigration);
        await tx.exec(reportOrderDateMigration);
        await tx.exec(stockAdjustmentMigration);
        await tx.exec(productRenamesMigration);
        await tx.exec(staffPermissionsMigration);
      });
      return db;
    })();
  return dbPromise;
}
export function demoRpc<T>(
  actor: string,
  fn: "shop_read" | "shop_write" | "shop_partial_fulfillment" | "shop_customer" | "shop_set_wholesale_price" | "shop_business_extras" | "shop_bulk_price",
  payload: unknown,
): Promise<T> {
  const call = queue.then(async () => {
    const db = await getDb();
    return db.transaction(async (tx) => {
      await tx.query("select set_config('app.user_id',$1,true)", [actor]);
      const r = await tx.query<{ result: T }>(
        fn==='shop_business_extras' ? `select public.${fn}() result` : `select public.${fn}($1::jsonb) result`,
        fn==='shop_business_extras' ? [] : [JSON.stringify(payload)],
      );
      const result=r.rows[0].result;
      if(fn==='shop_read'&&result&&typeof result==='object'&&'me' in result){
        const data=result as any;
        const users=(await tx.query<User>('select id,permissions,permissions_version from app_private.app_users')).rows;
        for(const u of [data.me,...(data.users||[]),...(data.salespeople||[])])Object.assign(u,users.find(x=>x.id===u.id));
        const products=(await tx.query<{id:string;cost_configured:boolean;draft_quantity:number}>(`select p.id,p.cost_configured,coalesce(d.quantity,0)::int draft_quantity from app_private.products p left join (select i.product_id,sum(i.quantity) quantity from app_private.sales_order_items i join app_private.sales_orders o on o.id=i.order_id where o.status='draft' group by i.product_id) d on d.product_id=p.id`)).rows;
        for(const p of data.products||[])Object.assign(p,products.find(x=>x.id===p.id));
        if(!hasPermission(data.me,'view_audit'))data.logs=[];
      }
      return result;
    });
  });
  queue = call.catch(() => {});
  return call;
}

export async function demoOrderBusiness<T>(actor: string, payload: unknown): Promise<T> {
  const db = await getDb();
  await db.query("select set_config('app.user_id',$1,false)", [actor]);
  const result = await db.query<{ result: T }>(
    "select public.shop_order_business($1::jsonb) result",
    [JSON.stringify(payload)],
  );
  return result.rows[0].result;
}

export function demoStockForecast(actor:string,from:string,to:string):Promise<import('../lib/stock-forecast').StockForecast>{
 const call=queue.then(async()=>{
  const {forecastDates}=await import('../lib/stock-forecast');const [start,end]=forecastDates(from,to);
  const db=await getDb();return db.transaction(async tx=>{
   const users=await tx.query('select id from app_private.app_users where id=$1 and active and role in (\'admin\',\'staff\')',[actor]);if(!users.rows.length)throw new Error('FORBIDDEN');
   const {rows}=await tx.query<any>(`select p.id product_id,p.sku,p.glass_type,b.on_hand,
    coalesce(d.quantity,0)::int draft_quantity,coalesce(m.quantity,0)::int delivered_quantity
    from app_private.products p join app_private.inventory_balances b on b.product_id=p.id
    left join (select i.product_id,sum(i.quantity) quantity from app_private.sales_order_items i join app_private.sales_orders o on o.id=i.order_id where o.status='draft' group by i.product_id) d on d.product_id=p.id
    left join (select product_id,sum(-quantity_delta) quantity from app_private.inventory_movements where movement_type='sale' and occurred_at>=$1::timestamptz and occurred_at<$2::timestamptz group by product_id) m on m.product_id=p.id
    where p.deleted_at is null order by p.sku`,[start,end]);
   return {from,to,rows:rows.map(r=>({...r,on_hand:Number(r.on_hand),draft_quantity:Number(r.draft_quantity),delivered_quantity:Number(r.delivered_quantity),estimated_quantity:Number(r.on_hand)-Number(r.draft_quantity)}))};
  });
 });queue=call.catch(()=>{});return call;
}

export function demoStaffPermissions(actor:string,payload:Record<string,unknown>):Promise<{id:string}>{
 const call=queue.then(async()=>{const db=await getDb();return db.transaction(async tx=>{
  await tx.query("select set_config('app.user_id',$1,true)",[actor]);
  const me=(await tx.query<{role:string}>('select role from app_private.current_actor()')).rows[0];
  if(me.role!=='admin')throw new Error('FORBIDDEN');
  const p=payload.permissions as Record<string,unknown>;
  if(!p||Array.isArray(p)||Object.keys(p).some(k=>!(k in permissionLabels)||typeof p[k]!=='boolean'))throw new Error('VALIDATION_ERROR');
  const updated=await tx.query<{id:string}>("update app_private.app_users set permissions=$1::jsonb,permissions_version=permissions_version+1 where id=$2 and role='staff' and permissions_version=$3 returning id",[JSON.stringify(p),payload.id,payload.version]);
  if(!updated.rows.length)throw new Error('VERSION_CONFLICT');
  await tx.query("insert into app_private.audit_logs(actor_id,action,detail) values($1,'staff.permissions',$2)",[actor,`${payload.id} / ${JSON.stringify(p)}`]);
  return updated.rows[0];
 });});queue=call.catch(()=>{});return call;
}

export function demoProductReport(actor:string,payload:Record<string,unknown>):Promise<ProductReportData>{
 const call=queue.then(async()=>{const db=await getDb();return db.transaction(async tx=>{
  await tx.query("select set_config('app.user_id',$1,true)",[actor]);
  await tx.query("select public.shop_read($1::jsonb)",[JSON.stringify({action:'report',from:payload.from,to:payload.to})]);
  const product=(await tx.query<ProductReportData['product']>('select id,sku,glass_type from app_private.products where id=$1',[payload.product_id])).rows[0];if(!product)throw new Error('PRODUCT_NOT_FOUND');
  const rows=(await tx.query<any>(`select i.id,coalesce(i.sku_snapshot,p.sku) sku,i.item_kind,coalesce(o.ordered_at,o.confirmed_at,o.created_at) ordered_at,coalesce(o.order_code,'DH-'||lpad(o.order_no::text,5,'0')) order_no,o.customer_name,coalesce(u.display_name,creator.display_name) sales,i.quantity ordered,i.delivered_quantity delivered,coalesce(rt.quantity,0)::integer returned,(i.delivered_quantity-coalesce(rt.quantity,0))::integer quantity,i.unit_sale_price::text unit_price,((i.delivered_quantity-coalesce(rt.quantity,0))*i.unit_sale_price)::text revenue from app_private.sales_order_items i join app_private.products p on p.id=i.product_id join app_private.sales_orders o on o.id=i.order_id join app_private.app_users creator on creator.id=o.created_by left join app_private.app_users u on u.id=o.sales_user_id left join (select ri.order_item_id,sum(ri.quantity) quantity from app_private.sales_return_items ri join app_private.sales_returns r on r.id=ri.return_id where r.posted_at<(($3::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh') group by ri.order_item_id) rt on rt.order_item_id=i.id where i.product_id=$1 and o.confirmed_at is not null and o.status in ('confirmed','partially_returned','returned') and coalesce(o.ordered_at,o.confirmed_at,o.created_at)>=($2::date::timestamp at time zone 'Asia/Ho_Chi_Minh') and coalesce(o.ordered_at,o.confirmed_at,o.created_at)<(($3::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh') order by ordered_at desc,o.id,i.line_position,i.id`,[payload.product_id,payload.from,payload.to])).rows;
  const offset=Number(payload.offset||0);if(!Number.isInteger(offset)||offset<0)throw new Error('VALIDATION_ERROR');
  const summary={total:rows.length,quantity:rows.reduce((n,r)=>n+Number(r.quantity),0),revenue:rows.reduce((n,r)=>n+BigInt(r.revenue),0n).toString()};
  return {product,summary,offset,rows:(payload.export===true?rows:rows.slice(offset,offset+200)).map(r=>({...r,ordered_at:r.ordered_at instanceof Date?r.ordered_at.toISOString():r.ordered_at}))};
 });});queue=call.catch(()=>{});return call;
}

export async function demoOrderExtras<T>(actor: string): Promise<T> {
  const db = await getDb();
  await db.query("select set_config('app.user_id',$1,false)", [actor]);
  const result = await db.query<{ result: T }>(
    "select public.shop_order_extras() result",
  );
  return result.rows[0].result;
}
export async function demoOrderFeatures<T>(
  actor: string,
  payload: unknown,
): Promise<T> {
  const db = await getDb();
  await db.query("select set_config('app.user_id',$1,false)", [actor]);
  const result = await db.query<{ result: T }>(
    "select public.shop_order_features($1::jsonb) result",
    [JSON.stringify(payload)],
  );
  return result.rows[0].result;
}
