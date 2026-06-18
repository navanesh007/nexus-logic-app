
create policy "users read own chat images"
on storage.objects for select to authenticated
using (bucket_id = 'chat-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users upload own chat images"
on storage.objects for insert to authenticated
with check (bucket_id = 'chat-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users delete own chat images"
on storage.objects for delete to authenticated
using (bucket_id = 'chat-images' and auth.uid()::text = (storage.foldername(name))[1]);
