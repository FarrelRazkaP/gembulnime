-- Jalankan sekali di Supabase Dashboard > SQL Editor.
-- Setiap pengguna hanya dapat membaca dan mengubah baris koleksinya sendiri.
create table if not exists public.user_library (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_library enable row level security;

create policy "Users can read their own library"
  on public.user_library for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own library"
  on public.user_library for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own library"
  on public.user_library for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_library to authenticated;
revoke all on public.user_library from anon;
