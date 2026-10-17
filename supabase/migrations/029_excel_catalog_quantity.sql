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
  perform app_ban_hang.only_keys(payload,array['action','key','items','reason']);
  if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items') not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if;
  declare rowdata jsonb; brand_id uuid; brand_name text; import_sku text; import_models text[]; created_count integer:=0; updated_count integer:=0; seen_ids uuid[]:='{}'; import_qty integer; import_docid uuid; import_lineid uuid; import_reason text:=trim(coalesce(nullif(payload->>'reason',''),'Nhập Excel danh mục và số lượng'));
  begin
   if length(import_reason) not between 1 and 1000 then raise exception 'VALIDATION_ERROR'; end if;
   for rowdata in select value from jsonb_array_elements(payload->'items') order by upper(trim(value->>'sku')) loop
    if rowdata ? 'quantity' and coalesce(rowdata->>'quantity','') !~ '^[0-9]{1,7}$' then raise exception 'VALIDATION_ERROR'; end if;
    import_qty:=coalesce(rowdata->>'quantity','0')::integer;
    if import_qty not between 0 and 1000000 then raise exception 'VALIDATION_ERROR'; end if;
    import_sku:=upper(trim(rowdata->>'sku')); brand_name:=trim(coalesce(rowdata->>'glass_brand',''));
    if import_sku is null or length(import_sku) not between 1 and 50
      or coalesce(rowdata->>'glass_type','') not in ('clear','privacy','matte','other','full_border','premium_borderless')
      or length(coalesce(nullif(trim(rowdata->>'brand'),''),'other'))>100 or length(brand_name)>100
      or coalesce(rowdata->>'sale_price','') !~ '^[0-9]{1,15}$'
      or coalesce(rowdata->>'wholesale_price','') !~ '^[0-9]{1,15}$'
      or coalesce(rowdata->>'fixed_cost','') !~ '^[0-9]{1,15}$'
      or jsonb_typeof(rowdata->'models') is distinct from 'array' then raise exception 'VALIDATION_ERROR'; end if;
    if jsonb_array_length(rowdata->'models')>500 or exists(select 1 from jsonb_array_elements(rowdata->'models') m where jsonb_typeof(m)<>'string' or length(trim(m#>>'{}')) not between 1 and 200) then raise exception 'VALIDATION_ERROR'; end if;
    select coalesce(array_agg(v order by first_pos),'{}'::text[]) into import_models from (select trim(value) v,min(ordinality) first_pos from jsonb_array_elements_text(rowdata->'models') with ordinality group by trim(value)) names;
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
    if import_qty>0 then
     if import_docid is null then
      insert into app_ban_hang.inventory_documents(type,reason,created_by) values('receipt',import_reason,u.id) returning id into import_docid;
     end if;
     select name into oldname from app_ban_hang.products where id=pid;
     insert into app_ban_hang.inventory_document_items(document_id,product_id,quantity_delta,unit_purchase_price,fixed_cost_snapshot,sku_snapshot,name_snapshot)
      values(import_docid,pid,import_qty,null,(rowdata->>'fixed_cost')::numeric,import_sku,oldname) returning id into import_lineid;
     perform app_ban_hang.move_stock(pid,import_qty,'receipt',u.id,import_lineid);
    end if;
   end loop;
   if import_docid is not null then insert into app_ban_hang.audit_logs(actor_id,action,detail) values(u.id,'inventory','receipt: '||import_reason); end if;
   result:=jsonb_build_object('created',created_count,'updated',updated_count); detail:='Excel danh mục';
  end;
$branch$;
begin
 definition:=pg_get_functiondef('public.app_ban_hang_write(jsonb)'::regprocedure);
 if position(' elsif act=''inventory'' then' in definition)=0 then raise exception 'Import migration source mismatch'; end if;
 if position(' elsif act=''import_products'' then' in definition)>0 then
  definition:=substring(definition from 1 for position(' elsif act=''import_products'' then' in definition)-1) || branch || substring(definition from position(' elsif act=''inventory'' then' in definition));
 else
  definition:=replace(definition,' elsif act=''inventory'' then',branch || ' elsif act=''inventory'' then');
 end if;
 execute definition;
 definition:=pg_get_functiondef('public.app_ban_hang_read(jsonb)'::regprocedure);
 if position('p.wholesale_price::text' in definition)=0 then execute replace(definition,'p.sale_price::text,','p.sale_price::text,p.wholesale_price::text,'); end if;
end $migration$;

