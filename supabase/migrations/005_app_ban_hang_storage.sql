-- Supabase-only migration, after 001_shop.sql. Never apply to an unrelated project.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('app-ban-hang-product-images','app-ban-hang-product-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create function public.can_access_app_ban_hang_images(write_access boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from app_ban_hang.app_users where id=auth.uid() and active and (not write_access or role='admin'))
$$;
revoke all on function public.can_access_app_ban_hang_images(boolean) from public,anon;
grant execute on function public.can_access_app_ban_hang_images(boolean) to authenticated;
create policy "AppBanHang users read product images" on storage.objects for select to authenticated using(bucket_id='app-ban-hang-product-images' and public.can_access_app_ban_hang_images(false));
create policy "AppBanHang admin adds product images" on storage.objects for insert to authenticated with check(bucket_id='app-ban-hang-product-images' and public.can_access_app_ban_hang_images(true));
create function public.can_remove_app_ban_hang_image(object_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select public.can_access_app_ban_hang_images(true) and not exists(select 1 from app_ban_hang.products where image_path=object_name)
$$;
revoke all on function public.can_remove_app_ban_hang_image(text) from public,anon;
grant execute on function public.can_remove_app_ban_hang_image(text) to authenticated;
create policy "AppBanHang admin removes unused product images" on storage.objects for delete to authenticated using(bucket_id='app-ban-hang-product-images' and public.can_remove_app_ban_hang_image(name));
