-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Enables server-backed subscription state and secure RPCs for trial / preview.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  subscription_state text not null default 'none'
    check (subscription_state in ('none', 'trial', 'active', 'preview', 'expired')),
  trial_ends_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Start 7-day trial (only from none / preview / expired)
create or replace function public.start_app_trial()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    subscription_state = 'trial',
    trial_ends_at = now() + interval '7 days',
    updated_at = now()
  where id = auth.uid()
    and subscription_state in ('none', 'preview', 'expired');
end;
$$;

grant execute on function public.start_app_trial() to authenticated;

-- Free preview tier (skip paywall)
create or replace function public.enter_app_preview()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    subscription_state = 'preview',
    updated_at = now()
  where id = auth.uid()
    and subscription_state in ('none', 'expired');
end;
$$;

grant execute on function public.enter_app_preview() to authenticated;

-- Owner: set is_admin = true for your user in Table Editor → profiles (or via SQL):
-- update public.profiles set is_admin = true where email = 'you@example.com';
