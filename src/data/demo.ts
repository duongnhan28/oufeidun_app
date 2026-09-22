import { PGlite } from "@electric-sql/pglite";
import schema from "../../supabase/migrations/001_shop.sql?raw";
import brandsMigration from "../../supabase/migrations/003_glass_brands.sql?raw";
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
  const db = new PGlite("idb://kinh-demo-v7");
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
      return db;
    })();
  return dbPromise;
}
export function demoRpc<T>(
  actor: string,
  fn: "shop_read" | "shop_write",
  payload: unknown,
): Promise<T> {
  const call = queue.then(async () => {
    const db = await getDb();
    return db.transaction(async (tx) => {
      await tx.query("select set_config('app.user_id',$1,true)", [actor]);
      const r = await tx.query<{ result: T }>(
        `select public.${fn}($1::jsonb) result`,
        [JSON.stringify(payload)],
      );
      return r.rows[0].result;
    });
  });
  queue = call.catch(() => {});
  return call;
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
