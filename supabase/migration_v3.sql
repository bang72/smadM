-- LOKA v3 Production Hardening
-- Jalankan SETELAH schema.sql dan migration_v2.sql.

create extension if not exists pg_trgm;

alter table public.profiles add column if not exists private_account boolean not null default false;
alter table public.profiles add column if not exists discoverable boolean not null default true;
alter table public.profiles add column if not exists hide_counts boolean not null default false;
alter table public.profiles add column if not exists allow_messages text not null default 'following';
alter table public.profiles add column if not exists notification_preferences jsonb not null default '{"like":true,"comment":true,"follow":true,"message":true}'::jsonb;
alter table public.profiles add column if not exists deletion_requested_at timestamptz;
alter table public.profiles add column if not exists last_seen_at timestamptz;

alter table public.posts add column if not exists visibility text not null default 'public';
alter table public.posts add column if not exists allow_comments boolean not null default true;
alter table public.posts add column if not exists content_warning text;
alter table public.posts add column if not exists edited_at timestamptz;
alter table public.posts add column if not exists circle_id uuid;

alter table public.post_media add column if not exists alt_text text not null default '';
alter table public.post_media add column if not exists file_size bigint;
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column if not exists status text not null default 'active';
alter table public.stories add column if not exists audience text not null default 'public';
alter table public.reports add column if not exists snapshot jsonb not null default '{}'::jsonb;
alter table public.reports add column if not exists priority smallint not null default 2;

do $$ begin alter table public.profiles add constraint profiles_messages_check check (allow_messages in ('everyone','following','none')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.posts add constraint posts_visibility_check check (visibility in ('public','followers','circle','private')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.stories add constraint stories_audience_check check (audience in ('public','followers','close_friends')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.comments add constraint comments_status_check check (status in ('active','hidden','removed')); exception when duplicate_object then null; end $$;

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(blocker_id, blocked_id), check(blocker_id <> blocked_id)
);
create table if not exists public.mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(muter_id, muted_id), check(muter_id <> muted_id)
);
create table if not exists public.follow_requests (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(requester_id, target_id), check(requester_id <> target_id)
);
create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check(char_length(name) between 1 and 32), color text not null default 'cobalt',
  created_at timestamptz not null default now(), unique(owner_id, name)
);
create table if not exists public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(circle_id, profile_id)
);
do $$ begin alter table public.posts add constraint posts_circle_fk foreign key(circle_id) references public.circles(id) on delete set null; exception when duplicate_object then null; end $$;

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(), primary key(story_id, viewer_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(), created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz, joined_at timestamptz not null default now(), primary key(conversation_id, profile_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 2000), status text not null default 'active' check(status in ('active','removed')),
  created_at timestamptz not null default now(), edited_at timestamptz
);

create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(), appellant_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check(target_type in ('post','profile','comment')), target_id uuid not null,
  reason text not null check(char_length(reason) between 10 and 1000), status text not null default 'open' check(status in ('open','accepted','rejected')),
  reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.account_deletion_requests (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(), execute_after timestamptz not null default(now() + interval '14 days'), cancelled_at timestamptz
);
create table if not exists public.action_rate_limits (
  user_id uuid not null references public.profiles(id) on delete cascade, action text not null,
  window_start timestamptz not null, action_count integer not null default 1, primary key(user_id, action, window_start)
);

create index if not exists profiles_search_trgm_idx on public.profiles using gin ((username || ' ' || display_name) gin_trgm_ops);
create index if not exists posts_body_trgm_idx on public.posts using gin (body gin_trgm_ops);
create index if not exists posts_feed_cursor_idx on public.posts(status, created_at desc, id);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at desc);
create index if not exists blocks_blocked_idx on public.blocks(blocked_id, blocker_id);
create index if not exists follow_requests_target_idx on public.follow_requests(target_id, status, created_at desc);
create index if not exists comments_parent_idx on public.comments(parent_id, created_at);

create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a));
$$;
create or replace function public.is_conversation_member(conversation_uuid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from conversation_members where conversation_id=conversation_uuid and profile_id=auth.uid());
$$;
create or replace function public.can_view_post(post_uuid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from posts p where p.id=post_uuid and p.status='active'
    and not public.is_blocked(auth.uid(), p.author_id)
    and (p.visibility='public' or p.author_id=auth.uid()
      or (p.visibility='followers' and exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=p.author_id))
      or (p.visibility='circle' and exists(select 1 from circle_members cm where cm.circle_id=p.circle_id and cm.profile_id=auth.uid())))
  );
$$;

create or replace function public.consume_action_limit(action_name text, max_actions integer, window_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare bucket timestamptz; current_count integer;
begin
  if auth.uid() is null then return false; end if;
  bucket := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  insert into action_rate_limits(user_id, action, window_start, action_count) values(auth.uid(), action_name, bucket, 1)
  on conflict(user_id, action, window_start) do update set action_count=action_rate_limits.action_count+1
  returning action_count into current_count;
  return current_count <= max_actions;
end; $$;

create or replace function public.toggle_block(target_uuid uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if target_uuid=auth.uid() then raise exception 'invalid target'; end if;
  if exists(select 1 from blocks where blocker_id=auth.uid() and blocked_id=target_uuid) then
    delete from blocks where blocker_id=auth.uid() and blocked_id=target_uuid; return false;
  end if;
  insert into blocks(blocker_id,blocked_id) values(auth.uid(),target_uuid);
  delete from follows where (follower_id=auth.uid() and following_id=target_uuid) or (follower_id=target_uuid and following_id=auth.uid());
  delete from follow_requests where (requester_id=auth.uid() and target_id=target_uuid) or (requester_id=target_uuid and target_id=auth.uid());
  return true;
end; $$;

create or replace function public.follow_or_request(target_uuid uuid)
returns text language plpgsql security definer set search_path=public as $$
declare target_private boolean;
begin
  if target_uuid=auth.uid() or public.is_blocked(auth.uid(),target_uuid) then raise exception 'invalid target'; end if;
  if exists(select 1 from follows where follower_id=auth.uid() and following_id=target_uuid) then
    delete from follows where follower_id=auth.uid() and following_id=target_uuid; return 'unfollowed';
  end if;
  select private_account into target_private from profiles where id=target_uuid and account_status='active';
  if target_private then insert into follow_requests(requester_id,target_id) values(auth.uid(),target_uuid) on conflict(requester_id,target_id) do update set status='pending',updated_at=now(); return 'requested'; end if;
  insert into follows(follower_id,following_id) values(auth.uid(),target_uuid); return 'followed';
end; $$;

create or replace function public.respond_follow_request(requester_uuid uuid, accept_request boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if accept_request then insert into follows(follower_id,following_id) values(requester_uuid,auth.uid()) on conflict do nothing; end if;
  update follow_requests set status=case when accept_request then 'accepted' else 'declined' end,updated_at=now() where requester_id=requester_uuid and target_id=auth.uid() and status='pending';
end; $$;

create or replace function public.start_conversation(target_uuid uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare conversation_uuid uuid; target_setting text;
begin
  if target_uuid=auth.uid() or public.is_blocked(auth.uid(),target_uuid) then raise exception 'Pesan tidak diizinkan'; end if;
  select allow_messages into target_setting from profiles where id=target_uuid and account_status='active';
  if target_setting='none' or (target_setting='following' and not exists(select 1 from follows where follower_id=target_uuid and following_id=auth.uid())) then raise exception 'Pengguna ini membatasi pesan'; end if;
  select cm1.conversation_id into conversation_uuid from conversation_members cm1 join conversation_members cm2 on cm2.conversation_id=cm1.conversation_id and cm2.profile_id=target_uuid where cm1.profile_id=auth.uid() and (select count(*) from conversation_members c where c.conversation_id=cm1.conversation_id)=2 limit 1;
  if conversation_uuid is null then
    insert into conversations(created_by) values(auth.uid()) returning id into conversation_uuid;
    insert into conversation_members(conversation_id,profile_id) values(conversation_uuid,auth.uid()),(conversation_uuid,target_uuid);
  end if;
  return conversation_uuid;
end; $$;

create or replace function public.admin_warn_profile(profile_uuid uuid, note_value text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if profile_uuid=auth.uid() then raise exception 'cannot moderate yourself'; end if;
  update profiles set warning_count=warning_count+1 where id=profile_uuid and role<>'admin';
  insert into moderation_actions(admin_id,action,target_type,target_id,note) values(auth.uid(),'warning','profile',profile_uuid,left(coalesce(note_value,''),500));
  insert into notifications(recipient_id,actor_id,type,data) values(profile_uuid,auth.uid(),'warning',jsonb_build_object('note',left(coalesce(note_value,''),500)));
end; $$;
create or replace function public.admin_review_appeal(appeal_uuid uuid, decision text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if decision not in ('accepted','rejected') then raise exception 'invalid decision'; end if;
  update appeals set status=decision,reviewed_by=auth.uid(),reviewed_at=now() where id=appeal_uuid and status='open';
  insert into moderation_actions(admin_id,action,target_type,target_id) values(auth.uid(),'appeal_'||decision,'appeal',appeal_uuid);
end; $$;

alter table public.blocks enable row level security; alter table public.mutes enable row level security;
alter table public.follow_requests enable row level security; alter table public.circles enable row level security;
alter table public.circle_members enable row level security; alter table public.story_views enable row level security;
alter table public.conversations enable row level security; alter table public.conversation_members enable row level security;
alter table public.messages enable row level security; alter table public.appeals enable row level security;
alter table public.account_deletion_requests enable row level security; alter table public.action_rate_limits enable row level security;

drop policy if exists "profiles public readable" on public.profiles;
create policy "profiles visibility" on public.profiles for select to anon,authenticated using ((account_status<>'banned' and not public.is_blocked(auth.uid(),id)) or id=auth.uid() or public.is_admin());
drop policy if exists "active posts public readable" on public.posts;
create policy "visible posts readable" on public.posts for select to anon,authenticated using (public.can_view_post(id) or public.is_admin());
drop policy if exists "post media public readable" on public.post_media;
create policy "visible media readable" on public.post_media for select to anon,authenticated using (public.can_view_post(post_id) or public.is_admin());
drop policy if exists "stories public readable" on public.stories;
create policy "audience stories readable" on public.stories for select to anon,authenticated using (
  ((status='active' and expires_at>now() and not public.is_blocked(auth.uid(),user_id)) and
    (audience='public' or user_id=auth.uid() or (audience='followers' and exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=user_id))
    or (audience='close_friends' and exists(select 1 from circle_members cm join circles c on c.id=cm.circle_id where c.owner_id=user_id and lower(c.name)='teman dekat' and cm.profile_id=auth.uid()))))
  or public.is_admin()
);

-- Reaksi dan tanggapan mengikuti hak akses post, bukan terbuka global.
drop policy if exists "likes public readable" on public.likes;
drop policy if exists "likes readable" on public.likes;
create policy "visible likes readable" on public.likes for select to anon,authenticated using(public.can_view_post(post_id));
drop policy if exists "active users create own likes" on public.likes;
create policy "users like visible posts" on public.likes for insert to authenticated with check(user_id=auth.uid() and public.can_view_post(post_id));
drop policy if exists "comments public readable" on public.comments;
drop policy if exists "comments readable" on public.comments;
create policy "visible comments readable" on public.comments for select to anon,authenticated using(public.can_view_post(post_id));
drop policy if exists "active users create own comments" on public.comments;
create policy "users comment visible posts" on public.comments for insert to authenticated with check(user_id=auth.uid() and public.can_view_post(post_id) and exists(select 1 from posts p where p.id=post_id and p.allow_comments));

create policy "users read own blocks" on public.blocks for select to authenticated using(blocker_id=auth.uid());
create policy "users read own mutes" on public.mutes for select to authenticated using(muter_id=auth.uid());
create policy "users manage own mutes" on public.mutes for all to authenticated using(muter_id=auth.uid()) with check(muter_id=auth.uid());
create policy "follow requests visible to parties" on public.follow_requests for select to authenticated using(requester_id=auth.uid() or target_id=auth.uid());
create policy "users read own circles" on public.circles for select to authenticated using(owner_id=auth.uid());
create policy "users manage own circles" on public.circles for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "circle members visible" on public.circle_members for select to authenticated using(profile_id=auth.uid() or exists(select 1 from circles c where c.id=circle_id and c.owner_id=auth.uid()));
create policy "owners manage circle members" on public.circle_members for all to authenticated using(exists(select 1 from circles c where c.id=circle_id and c.owner_id=auth.uid())) with check(exists(select 1 from circles c where c.id=circle_id and c.owner_id=auth.uid()));
create policy "story viewers insert" on public.story_views for insert to authenticated with check(viewer_id=auth.uid());
create policy "story owners read views" on public.story_views for select to authenticated using(viewer_id=auth.uid() or exists(select 1 from stories s where s.id=story_id and s.user_id=auth.uid()));
create policy "members read conversations" on public.conversations for select to authenticated using(public.is_conversation_member(id));
create policy "members read memberships" on public.conversation_members for select to authenticated using(public.is_conversation_member(conversation_id));
create policy "members update own membership" on public.conversation_members for update to authenticated using(profile_id=auth.uid());
create policy "members read messages" on public.messages for select to authenticated using(public.is_conversation_member(conversation_id));
create policy "members send messages" on public.messages for insert to authenticated with check(sender_id=auth.uid() and public.is_conversation_member(conversation_id));
create policy "senders edit messages" on public.messages for update to authenticated using(sender_id=auth.uid()) with check(sender_id=auth.uid());
create policy "users create appeals" on public.appeals for insert to authenticated with check(appellant_id=auth.uid());
create policy "users or admins read appeals" on public.appeals for select to authenticated using(appellant_id=auth.uid() or public.is_admin());
create policy "users manage deletion request" on public.account_deletion_requests for all to authenticated using(profile_id=auth.uid()) with check(profile_id=auth.uid());

grant execute on function public.consume_action_limit(text,integer,integer) to authenticated;
grant execute on function public.toggle_block(uuid) to authenticated;
grant execute on function public.follow_or_request(uuid) to authenticated;
grant execute on function public.respond_follow_request(uuid,boolean) to authenticated;
grant execute on function public.start_conversation(uuid) to authenticated;
grant execute on function public.admin_warn_profile(uuid,text) to authenticated;
grant execute on function public.admin_review_appeal(uuid,text) to authenticated;
grant select,insert,update,delete on public.blocks,public.mutes,public.follow_requests,public.circles,public.circle_members,public.story_views,public.conversations,public.conversation_members,public.messages,public.appeals,public.account_deletion_requests to authenticated;

-- Media nonpublik memakai bucket privat dan URL bertanda tangan yang singkat.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('private-media','private-media',false,52428800,array[
  'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime',
  'audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm'
]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "users upload private media" on storage.objects for insert to authenticated with check(bucket_id='private-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "owners delete private media" on storage.objects for delete to authenticated using(bucket_id='private-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "audience reads private media" on storage.objects for select to authenticated using(
  bucket_id='private-media' and (
    exists(select 1 from public.post_media pm where pm.storage_path=name and public.can_view_post(pm.post_id))
    or exists(select 1 from public.stories s where s.storage_path=name and (
      s.user_id=auth.uid()
      or (s.status='active' and s.expires_at>now() and not public.is_blocked(auth.uid(),s.user_id) and (
        (s.audience='followers' and exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=s.user_id))
        or (s.audience='close_friends' and exists(select 1 from public.circle_members cm join public.circles c on c.id=cm.circle_id where c.owner_id=s.user_id and lower(c.name)='teman dekat' and cm.profile_id=auth.uid()))
      ))
    ))
  )
);

-- Jenis sinyal tambahan untuk permintaan follow, pesan, dan peringatan moderator.
alter table public.notifications add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check(type in ('like','comment','follow','follow_request','message','warning'));

create or replace function public.notify_follow_request()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='pending' and coalesce((select (notification_preferences->>'follow')::boolean from profiles where id=new.target_id),true) then
    insert into notifications(recipient_id,actor_id,type) values(new.target_id,new.requester_id,'follow_request');
  end if;
  return new;
end; $$;
drop trigger if exists on_follow_request_created on public.follow_requests;
create trigger on_follow_request_created after insert on public.follow_requests for each row execute procedure public.notify_follow_request();

create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into notifications(recipient_id,actor_id,type,data)
  select cm.profile_id,new.sender_id,'message',jsonb_build_object('conversation_id',new.conversation_id)
  from conversation_members cm join profiles p on p.id=cm.profile_id
  where cm.conversation_id=new.conversation_id and cm.profile_id<>new.sender_id
    and coalesce((p.notification_preferences->>'message')::boolean,true);
  return new;
end; $$;
drop trigger if exists on_message_created on public.messages;
create trigger on_message_created after insert on public.messages for each row execute procedure public.notify_message();

create or replace function public.notify_like_or_comment()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; preference_key text;
begin
  select author_id into owner_id from posts where id=new.post_id;
  preference_key:=tg_argv[0];
  if owner_id is not null and owner_id<>new.user_id and coalesce((select (notification_preferences->>preference_key)::boolean from profiles where id=owner_id),true) then
    insert into notifications(recipient_id,actor_id,post_id,type) values(owner_id,new.user_id,new.post_id,preference_key);
  end if;
  return new;
end; $$;

create or replace function public.notify_follow()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce((select (notification_preferences->>'follow')::boolean from profiles where id=new.following_id),true) then
    insert into notifications(recipient_id,actor_id,type) values(new.following_id,new.follower_id,'follow');
  end if;
  return new;
end; $$;

-- Hanya kolom profil aman yang dapat diubah pemilik.
revoke update on public.profiles from authenticated;
grant update(username,display_name,bio,avatar_url,website,location,updated_at,private_account,discoverable,hide_counts,allow_messages,notification_preferences,last_seen_at,deletion_requested_at) on public.profiles to authenticated;
