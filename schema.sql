-- =====================================================
-- HOGA B Weekly Line Monitoring - Supabase Schema
-- Jalankan di Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. PROFILES (info user + role)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz not null default now()
);

-- Otomatis buat profile saat user baru dibuat
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. MONITORING
create table if not exists public.monitoring (
  id text primary key default gen_random_uuid()::text,
  report_date date not null,
  engineer text not null,
  line text not null,
  current_style text default '-',
  next_style text default '-',
  planned_start_date date not null,
  pre_layout_status text default 'Done',
  pp_approval_status text default 'Done',
  chief_sample_status text default 'Done',
  remark text default '-',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3. OVERLINE
create table if not exists public.overline (
  id text primary key default gen_random_uuid()::text,
  report_week_start date not null,
  engineer text not null,
  line text not null,
  current_style text default '-',
  next_style text default '-',
  planned_overline_date date not null,
  status text default 'Done',
  remark text default '-',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 4. FUNGSI CEK ADMIN
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 5. ROW LEVEL SECURITY
alter table public.profiles   enable row level security;
alter table public.monitoring enable row level security;
alter table public.overline   enable row level security;

-- profiles: user login boleh baca; perubahan hanya lewat service role (API Vercel)
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select to authenticated using (true);

-- monitoring & overline: semua user yang sudah login boleh CRUD
drop policy if exists "monitoring all" on public.monitoring;
create policy "monitoring all" on public.monitoring
  for all to authenticated using (true) with check (true);

drop policy if exists "overline all" on public.overline;
create policy "overline all" on public.overline
  for all to authenticated using (true) with check (true);

-- =====================================================
-- 6. JADIKAN USER PERTAMA SEBAGAI ADMIN
-- Buat user di Authentication > Users > Add user (centang Auto Confirm),
-- lalu jalankan (ganti emailnya):
--
-- update public.profiles set role = 'admin' where email = 'email-anda@perusahaan.com';
-- =====================================================
