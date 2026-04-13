-- FitTogether MVP schema for Supabase
-- Includes: auth profile sync, core entities, RLS, triggers

create extension if not exists pgcrypto;

-- =============================================
-- 1) TABLES
-- =============================================

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  age integer,
  city text,
  bio text,
  fitness_level text check (fitness_level in ('beginner', 'intermediate', 'advanced')),
  fitness_goals text,
  training_types text[] default '{}',
  available_time text[] default '{}',
  radius_km integer default 10,
  trust_score numeric(3,1) default 4.0,
  total_workouts integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  partner_id uuid references auth.users on delete set null,
  scheduled_time timestamp with time zone not null,
  type text,
  location text,
  status text default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  created_at timestamp with time zone default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users on delete cascade not null,
  receiver_id uuid references auth.users on delete cascade not null,
  workout_time timestamp with time zone,
  message text,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users on delete cascade not null,
  receiver_id uuid references auth.users on delete cascade not null,
  content text,
  attachment_path text,
  attachment_mime text,
  attachment_kind text check (attachment_kind in ('image', 'video', 'gif', 'sticker', 'file')),
  sent_at timestamp with time zone default now()
);

create table if not exists public.blocked_users (
  blocker_id uuid references auth.users on delete cascade not null,
  blocked_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  workouts_completed integer default 0,
  progress_metric numeric default 0,
  total_duration integer default 0,
  recorded_at timestamp with time zone default now()
);

-- =============================================
-- 2) TRIGGERS & FUNCTIONS
-- =============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Новый пользователь'))
  on conflict (id) do nothing;

  insert into public.progress (user_id)
  values (new.id)
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_profiles_updated_at on profiles;
create trigger update_profiles_updated_at
  before update on profiles
  for each row execute function public.update_updated_at_column();

create or replace function public.sync_profile_stats_from_workouts()
returns trigger as $$
declare
  target_user uuid;
begin
  target_user := coalesce(new.user_id, old.user_id);

  update public.profiles p
  set total_workouts = (
    select count(*)::int
    from public.workouts w
    where w.user_id = target_user
      and w.status = 'completed'
  )
  where p.id = target_user;

  insert into public.progress (user_id, workouts_completed, progress_metric, total_duration, recorded_at)
  values (
    target_user,
    (select count(*)::int from public.workouts w where w.user_id = target_user and w.status = 'completed'),
    (select count(*)::numeric from public.workouts w where w.user_id = target_user and w.status = 'completed'),
    0,
    now()
  );

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists workouts_sync_profile_stats on public.workouts;
create trigger workouts_sync_profile_stats
  after insert or update or delete on public.workouts
  for each row execute function public.sync_profile_stats_from_workouts();

-- =============================================
-- 3) RLS POLICIES
-- =============================================

alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.invitations enable row level security;
alter table public.messages enable row level security;
alter table public.blocked_users enable row level security;
alter table public.progress enable row level security;

drop policy if exists "Anyone can read profiles" on profiles;
drop policy if exists "Users can update own profile" on profiles;
create policy "Anyone can read profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for all using (auth.uid() = id);

drop policy if exists "Users can read related workouts" on workouts;
drop policy if exists "Users can manage own workouts" on workouts;
create policy "Users can read related workouts" on workouts
  for select using (auth.uid() = user_id or auth.uid() = partner_id);
create policy "Users can manage own workouts" on workouts
  for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own invitations" on invitations;
create policy "Users can manage own invitations" on invitations
  for all using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can manage own messages" on messages;
create policy "Users can manage own messages" on messages
  for all using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can manage own blocks" on blocked_users;
create policy "Users can manage own blocks" on blocked_users
  for all using (auth.uid() = blocker_id);

drop policy if exists "Users can read own progress" on progress;
drop policy if exists "Users can create own progress" on progress;
create policy "Users can read own progress" on progress
  for select using (auth.uid() = user_id);
create policy "Users can create own progress" on progress
  for insert with check (auth.uid() = user_id);

-- =============================================
-- 4) REALTIME FOR CHAT
-- =============================================

alter publication supabase_realtime add table public.messages;
