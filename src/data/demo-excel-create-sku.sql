-- Only update the inventory branch; retain all prior order/auth rules.
do $migration$
declare definition text; old_block text:=$old$   perform app_private.only_keys(el,array['product_id','quantity','purchase_price','stock_version']);
   if (el->>'quantity') !~ '^[0-9]+$' then raise exception 'VALIDATION_ERROR'; end if;
   pid:=(el->>'product_id')::uuid; n:=(el->>'quantity')::integer;$old$; new_block text:=$new$   perform app_private.only_keys(el,array['product_id','sku','quantity','purchase_price','stock_version']);
   if (el->>'quantity') is null or (el->>'quantity') !~ '^[0-9]+$' then raise exception 'VALIDATION_ERROR'; end if;
   if el ? 'sku' then
    if kind<>'receipt' or el->>'product_id' is not null then raise exception 'VALIDATION_ERROR'; end if;
    oldname:=upper(trim(el->>'sku'));
    if oldname is null or length(oldname) not between 1 and 50 or coalesce(el->>'purchase_price','') !~ '^[0-9]{1,15}$' then raise exception 'VALIDATION_ERROR'; end if;
    pid:=null;
    insert into app_private.products(sku,name,glass_type,brand,sale_price) values(oldname,oldname,'other','other',0) on conflict(sku) do nothing returning id into pid;
    if pid is not null then
     insert into app_private.product_costs(product_id,fixed_cost) values(pid,(el->>'purchase_price')::numeric);
     insert into app_private.inventory_balances(product_id) values(pid);
    else
     select id into pid from app_private.products where sku=oldname and deleted_at is null for update;
     if pid is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
    end if;
   else pid:=(el->>'product_id')::uuid;
   end if;
   if pid is null or pid=any(seen_products) then raise exception 'VALIDATION_ERROR'; end if;
   seen_products:=array_append(seen_products,pid);
   n:=(el->>'quantity')::integer;$new$;
begin
 definition:=pg_get_functiondef('public.shop_write(jsonb)'::regprocedure);
 if position(new_block in definition)>0 then return; end if;
 if position(old_block in definition)=0 or position('el jsonb; oid uuid;' in definition)=0 then raise exception 'Inventory migration source mismatch'; end if;
 definition:=replace(definition,'el jsonb; oid uuid;','seen_products uuid[]:=''{}''; el jsonb; oid uuid;');
 definition:=replace(definition,old_block,new_block);
 execute definition;
end
$migration$;
