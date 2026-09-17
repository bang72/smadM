-- LOKA Living Social v2 — jalankan sekali jika schema versi awal sudah pernah dipasang.
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists warning_count integer not null default 0;
alter table public.posts add column if not exists kind text not null default 'note';
alter table public.posts add column if not exists status text not null default 'active';

do $$ begin
  alter table public.profiles add constraint profiles_role_check check (role in ('user','admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_status_check check (account_status in ('active','suspended','banned'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.posts add constraint posts_kind_check check (kind in ('note','moment','sound','question'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.posts add constraint posts_status_check check (status in ('active','hidden','removed'));
exception when duplicate_object then null; end $$;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 180), media_url text not null, storage_path text not null unique,
  media_type text not null check (media_type in ('image','video','audio')), accent text not null default 'cobalt',
  status text not null default 'active' check (status in ('active','hidden','removed')),
  created_at timestamptz not null default now(), expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','profile')), target_id uuid not null,
  reason text not null check (reason in ('spam','harassment','hate','nudity','violence','misinformation','other')),
  details text not null default '' check (char_length(details) <= 500), status text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolved_by uuid references public.profiles(id), resolved_at timestamptz, created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(), admin_id uuid not null references public.profiles(id),
  action text not null, target_type text not null, target_id uuid not null, note text not null default '', created_at timestamptz not null default now()
);

create index if not exists stories_active_idx on public.stories(expires_at desc) where status = 'active';
create index if not exists reports_queue_idx on public.reports(status, created_at desc);
create index if not exists follows_following_idx on public.follows(following_id, created_at desc);

alter table public.stories enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and account_status = 'active');
$$;

drop policy if exists "profiles readable by signed in users" on public.profiles;
drop policy if exists "profiles public readable" on public.profiles;
create policy "profiles public readable" on public.profiles for select to anon, authenticated using (account_status <> 'banned' or id = auth.uid() or public.is_admin());

drop policy if exists "posts readable by signed in users" on public.posts;
drop policy if exists "active posts public readable" on public.posts;
create policy "active posts public readable" on public.posts for select to anon, authenticated using (status = 'active' or author_id = auth.uid() or public.is_admin());
drop policy if exists "users create own posts" on public.posts;
create policy "active users create own posts" on public.posts for insert to authenticated with check (author_id = auth.uid() and exists(select 1 from public.profiles where id = auth.uid() and account_status = 'active'));

drop policy if exists "media readable by signed in users" on public.post_media;
drop policy if exists "post media public readable" on public.post_media;
create policy "post media public readable" on public.post_media for select to anon, authenticated using (exists(select 1 from public.posts where posts.id = post_id and (posts.status = 'active' or posts.author_id = auth.uid() or public.is_admin())));

drop policy if exists "likes readable" on public.likes;
create policy "likes public readable" on public.likes for select to anon, authenticated using (true);
drop policy if exists "users create own likes" on public.likes;
create policy "active users create own likes" on public.likes for insert to authenticated with check (user_id = auth.uid() and exists(select 1 from public.profiles where id = auth.uid() and account_status = 'active'));
drop policy if exists "comments readable" on public.comments;
create policy "comments public readable" on public.comments for select to anon, authenticated using (true);
drop policy if exists "users create own comments" on public.comments;
create policy "active users create own comments" on public.comments for insert to authenticated with check (user_id = auth.uid() and exists(select 1 from public.profiles where id = auth.uid() and account_status = 'active'));
drop policy if exists "follows readable" on public.follows;
create policy "follows public readable" on public.follows for select to anon, authenticated using (true);
drop policy if exists "users create own follows" on public.follows;
create policy "active users create own follows" on public.follows for insert to authenticated with check (follower_id = auth.uid() and exists(select 1 from public.profiles where id = auth.uid() and account_status = 'active'));

drop policy if exists "stories public readable" on public.stories;
create policy "stories public readable" on public.stories for select to anon, authenticated using ((status = 'active' and expires_at > now()) or user_id = auth.uid() or public.is_admin());
drop policy if exists "users create own stories" on public.stories;
create policy "users create own stories" on public.stories for insert to authenticated with check (user_id = auth.uid() and exists(select 1 from public.profiles where id = auth.uid() and account_status = 'active'));
drop policy if exists "users delete own stories" on public.stories;
create policy "users delete own stories" on public.stories for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users create reports" on public.reports;
create policy "users create reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "users read own reports" on public.reports;
create policy "users read own reports" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists "admins read actions" on public.moderation_actions;
create policy "admins read actions" on public.moderation_actions for select to authenticated using (public.is_admin());

create or replace function public.admin_resolve_report(report_uuid uuid, resolution_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if resolution_value not in ('resolved','dismissed') then raise exception 'invalid status'; end if;
  update reports set status = resolution_value, resolved_by = auth.uid(), resolved_at = now() where id = report_uuid;
  insert into moderation_actions(admin_id, action, target_type, target_id) values(auth.uid(), 'report_' || resolution_value, 'report', report_uuid);
end; $$;

create or replace function public.admin_moderate_post(post_uuid uuid, status_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if status_value not in ('active','hidden','removed') then raise exception 'invalid status'; end if;
  update posts set status = status_value where id = post_uuid;
  insert into moderation_actions(admin_id, action, target_type, target_id) values(auth.uid(), 'post_' || status_value, 'post', post_uuid);
end; $$;

create or replace function public.admin_set_account_status(profile_uuid uuid, status_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if profile_uuid = auth.uid() then raise exception 'cannot moderate yourself'; end if;
  if status_value not in ('active','suspended','banned') then raise exception 'invalid status'; end if;
  update profiles set account_status = status_value where id = profile_uuid and role <> 'admin';
  insert into moderation_actions(admin_id, action, target_type, target_id) values(auth.uid(), 'account_' || status_value, 'profile', profile_uuid);
end; $$;

grant execute on function public.admin_resolve_report(uuid,text) to authenticated;
grant execute on function public.admin_moderate_post(uuid,text) to authenticated;
grant execute on function public.admin_set_account_status(uuid,text) to authenticated;

-- Cegah pengguna menaikkan role/status-nya sendiri lewat API.
revoke update on public.profiles from authenticated;
grant update (username, display_name, bio, avatar_url, website, location, updated_at) on public.profiles to authenticated;
