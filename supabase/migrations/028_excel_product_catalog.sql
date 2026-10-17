do $$ begin
 if not exists(select 1 from information_schema.columns where table_schema='app_ban_hang' and table_name='products' and column_name='wholesale_price') then
  alter table app_ban_hang.products add column wholesale_price numeric(18,0) not null default 0;
  -- Older demo datasets used retail as the wholesale fallback.
  update app_ban_hang.products set wholesale_price=sale_price;
 end if;
end $$;
alter table app_ban_hang.products drop constraint if exists products_glass_type_check;
alter table app_ban_hang.products add constraint products_glass_type_check check(glass_type in ('clear','privacy','matte','other','full_border','premium_borderless'));

do $migration$
declare definition text; branch text := $branch$
 elsif act='import_products' then
  perform app_ban_hang.only_keys(payload,array['action','key','items']);
  if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items') not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if;
  declare rowdata jsonb; brand_id uuid; brand_name text; import_sku text; import_models text[]; created_count integer:=0; updated_count integer:=0; seen_ids uuid[]:='{}';
  begin
   for rowdata in select value from jsonb_array_elements(payload->'items') order by upper(trim(value->>'sku')) loop
    import_sku:=upper(trim(rowdata->>'sku')); brand_name:=trim(coalesce(rowdata->>'glass_brand',''));
    if import_sku is null or length(import_sku) not between 1 and 50
      or coalesce(rowdata->>'glass_type','') not in ('clear','privacy','matte','other','full_border','premium_borderless')
      or length(coalesce(nullif(trim(rowdata->>'brand'),''),'other'))>100 or length(brand_name)>100
      or coalesce(rowdata->>'sale_price','') !~ '^[0-9]{1,15}$'
      or coalesce(rowdata->>'wholesale_price','') !~ '^[0-9]{1,15}$'
      or coalesce(rowdata->>'fixed_cost','') !~ '^[0-9]{1,15}$'
      or jsonb_typeof(rowdata->'models') is distinct from 'array' then raise exception 'VALIDATION_ERROR'; end if;
    if jsonb_array_length(rowdata->'models')>500 or exists(select 1 from jsonb_array_elements(rowdata->'models') m where jsonb_typeof(m)<>'string' or length(trim(m#>>'{}')) not between 1 and 200) then raise exception 'VALIDATION_ERROR'; end if;
    select coalesce(array_agg(v),'{}'::text[]) into import_models from (select distinct trim(value) v from jsonb_array_elements_text(rowdata->'models')) names;
    brand_id:=null;
    if brand_name<>'' then
     insert into app_ban_hang.glass_brands(name) values(brand_name) on conflict do nothing;
     select id into brand_id from app_ban_hang.glass_brands where lower(name)=lower(brand_name) for update;
    end if;
    pid:=null;
    insert into app_ban_hang.products(sku,name,glass_type,brand,sale_price,wholesale_price,models,glass_brand_id)
      values(import_sku,import_sku,rowdata->>'glass_type',coalesce(nullif(trim(rowdata->>'brand'),''),'other'),(rowdata->>'sale_price')::numeric,(rowdata->>'wholesale_price')::numeric,import_models,brand_id)
      on conflict(sku) do nothing returning id into pid;
    if pid is not null then
     created_count:=created_count+1;
     insert into app_ban_hang.inventory_balances(product_id) values(pid);
     insert into app_ban_hang.product_costs(product_id,fixed_cost) values(pid,(rowdata->>'fixed_cost')::numeric);
    else
     select * into p from app_ban_hang.products where sku=import_sku for update;
     if p.id is null or p.deleted_at is not null then raise exception 'PRODUCT_NOT_FOUND'; end if;
     pid:=p.id; updated_count:=updated_count+1;
     update app_ban_hang.products set glass_type=rowdata->>'glass_type',brand=coalesce(nullif(trim(rowdata->>'brand'),''),'other'),models=import_models,glass_brand_id=brand_id,
       wholesale_price=(rowdata->>'wholesale_price')::numeric,sale_price=(rowdata->>'sale_price')::numeric,
       price_version=price_version+case when p.wholesale_price<>(rowdata->>'wholesale_price')::numeric and p.sale_price=(rowdata->>'sale_price')::numeric then 1 else 0 end,version=version+1 where id=pid;
     update app_ban_hang.product_costs set fixed_cost=(rowdata->>'fixed_cost')::numeric where product_id=pid;
    end if;
    if pid=any(seen_ids) then raise exception 'VALIDATION_ERROR'; end if;
    seen_ids:=array_append(seen_ids,pid);
   end loop;
   result:=jsonb_build_object('created',created_count,'updated',updated_count); detail:='Excel danh mục';
  end;
$branch$;
begin
 definition:=pg_get_functiondef('public.app_ban_hang_write(jsonb)'::regprocedure);
 if position('elsif act=''import_products'' then' in definition)=0 then
  if position(' elsif act=''inventory'' then' in definition)=0 then raise exception 'Import migration source mismatch'; end if;
  execute replace(definition,' elsif act=''inventory'' then',branch || ' elsif act=''inventory'' then');
 end if;
 definition:=pg_get_functiondef('public.app_ban_hang_read(jsonb)'::regprocedure);
 if position('p.wholesale_price::text' in definition)=0 then execute replace(definition,'p.sale_price::text,','p.sale_price::text,p.wholesale_price::text,'); end if;
end $migration$;

