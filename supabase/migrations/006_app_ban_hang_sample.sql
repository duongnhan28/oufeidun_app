-- Sample catalog owned only by AppBanHang. No existing application data is read.
with brand as (
  insert into app_ban_hang.glass_brands(name)
  values ('Oufeidun')
  on conflict do nothing
  returning id
), selected_brand as (
  select id from brand
  union all
  select id from app_ban_hang.glass_brands where lower(name)='oufeidun'
  limit 1
), sample(sku,name,glass_type,device_brand,models,sale_price,fixed_cost) as (
  values
    ('IP15-TR','Kính trong iPhone 15','clear','Apple',array['iPhone 15','iPhone 16']::text[],25000::numeric,10000::numeric),
    ('IP15-CNT','Kính chống nhìn trộm iPhone 15','privacy','Apple',array['iPhone 15','iPhone 16']::text[],45000::numeric,20000::numeric),
    ('IP16P-TR','Kính trong iPhone 16 Pro','clear','Apple',array['iPhone 16 Pro']::text[],30000::numeric,12000::numeric),
    ('SS-A55','Kính trong Samsung A55','clear','Samsung',array['Samsung A55']::text[],25000::numeric,10000::numeric),
    ('OP-A78','Kính trong OPPO A78','clear','OPPO',array['OPPO A78']::text[],20000::numeric,8000::numeric),
    ('IP14PM','Kính trong iPhone 14 Pro Max','clear','Apple',array['iPhone 14 Pro Max']::text[],30000::numeric,12000::numeric)
), inserted as (
  insert into app_ban_hang.products(sku,name,glass_type,brand,models,sale_price,active,glass_brand_id)
  select s.sku,s.name,s.glass_type,s.device_brand,s.models,s.sale_price,true,b.id
  from sample s cross join selected_brand b
  on conflict(sku) do nothing
  returning id,sku
)
insert into app_ban_hang.product_costs(product_id,fixed_cost)
select i.id,s.fixed_cost from inserted i join sample s using(sku)
on conflict(product_id) do nothing;

insert into app_ban_hang.inventory_balances(product_id)
select id from app_ban_hang.products
on conflict(product_id) do nothing;

-- Stock starts at zero so the first real stock must be posted by an authenticated
-- admin through the normal "Tồn đầu kỳ" flow and gets a complete audit trail.
