-- Voxa bulut yedeği. Supabase → SQL Editor → New query → bunu yapıştır → Run.
create table if not exists public.backups (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.backups enable row level security;

drop policy if exists "kendi yedeğini oku" on public.backups;
drop policy if exists "kendi yedeğini ekle" on public.backups;
drop policy if exists "kendi yedeğini güncelle" on public.backups;
drop policy if exists "kendi yedeğini sil" on public.backups;

create policy "kendi yedeğini oku" on public.backups for select using ((select auth.uid()) = user_id);
create policy "kendi yedeğini ekle" on public.backups for insert with check ((select auth.uid()) = user_id);
create policy "kendi yedeğini güncelle" on public.backups for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "kendi yedeğini sil" on public.backups for delete using ((select auth.uid()) = user_id);
