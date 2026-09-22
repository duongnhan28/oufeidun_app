-- Supabase-only migration, after 001_shop.sql. Never apply to an unrelated project.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create function public.can_access_product_images(write_access boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from app_private.app_users where id=auth.uid() and active and (not write_access or role='admin'))
$$;
revoke all on function public.can_access_product_images(boolean) from public,anon;
grant execute on function public.can_access_product_images(boolean) to authenticated;
create policy "Active users read product images" on storage.objects for select to authenticated using(bucket_id='product-images' and public.can_access_product_images(false));
create policy "Admin adds product images" on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.can_access_product_images(true));
create function public.can_remove_product_image(object_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select public.can_access_product_images(true) and not exists(select 1 from app_private.products where image_path=object_name)
$$;
revoke all on function public.can_remove_product_image(text) from public,anon;
grant execute on function public.can_remove_product_image(text) to authenticated;
create policy "Admin removes unused product images" on storage.objects for delete to authenticated using(bucket_id='product-images' and public.can_remove_product_image(name));
