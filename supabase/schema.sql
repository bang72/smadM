-- LOKA production schema for Supabase
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 160),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  url text not null,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image', 'video', 'audio')),
  width integer,
  height integer,
  position smallint not null default 0 check (position between 0 and 3),
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'follow')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists posts_author_created_idx on public.posts(author_id, created_at desc);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists media_post_idx on public.post_media(post_id, position);
create index if not exists comments_post_idx on public.comments(post_id, created_at);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute procedure public.touch_updated_at();
drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at before update on public.posts for each row execute procedure public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  wanted_username text;
  wanted_name text;
begin
  wanted_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(wanted_username) < 3 then wanted_username := 'user_' || substring(new.id::text, 1, 8); end if;
  wanted_name := left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'Pengguna LOKA'), 40);
  begin
    insert into public.profiles (id, username, display_name) values (new.id, left(wanted_username, 20), wanted_name);
  exception when unique_violation then
    insert into public.profiles (id, username, display_name) values (new.id, left(wanted_username, 11) || '_' || substring(new.id::text, 1, 8), wanted_name);
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.notify_like_or_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  select author_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(recipient_id, actor_id, post_id, type)
    values (owner_id, new.user_id, new.post_id, tg_argv[0]);
  end if;
  return new;
end;
$$;

create or replace function public.notify_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(recipient_id, actor_id, type) values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

drop trigger if exists on_like_created on public.likes;
create trigger on_like_created after insert on public.likes for each row execute procedure public.notify_like_or_comment('like');
drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created after insert on public.comments for each row execute procedure public.notify_like_or_comment('comment');
drop trigger if exists on_follow_created on public.follows;
create trigger on_follow_created after insert on public.follows for each row execute procedure public.notify_follow();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.bookmarks enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;

create policy "profiles readable by signed in users" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "users insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());

create policy "posts readable by signed in users" on public.posts for select to authenticated using (true);
create policy "users create own posts" on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "users update own posts" on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "users delete own posts" on public.posts for delete to authenticated using (author_id = auth.uid());

create policy "media readable by signed in users" on public.post_media for select to authenticated using (true);
create policy "authors attach media" on public.post_media for insert to authenticated with check (exists(select 1 from public.posts where posts.id = post_id and posts.author_id = auth.uid()));
create policy "authors delete media" on public.post_media for delete to authenticated using (exists(select 1 from public.posts where posts.id = post_id and posts.author_id = auth.uid()));

create policy "likes readable" on public.likes for select to authenticated using (true);
create policy "users create own likes" on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own likes" on public.likes for delete to authenticated using (user_id = auth.uid());

create policy "comments readable" on public.comments for select to authenticated using (true);
create policy "users create own comments" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "users update own comments" on public.comments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own comments" on public.comments for delete to authenticated using (user_id = auth.uid());

create policy "users read own bookmarks" on public.bookmarks for select to authenticated using (user_id = auth.uid());
create policy "users create own bookmarks" on public.bookmarks for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own bookmarks" on public.bookmarks for delete to authenticated using (user_id = auth.uid());

create policy "follows readable" on public.follows for select to authenticated using (true);
create policy "users create own follows" on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "users delete own follows" on public.follows for delete to authenticated using (follower_id = auth.uid());

create policy "users read own notifications" on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy "users update own notifications" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array[
  'image/jpeg','image/png','image/webp','image/gif',
  'video/mp4','video/webm','video/quicktime',
  'audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm'
]) on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public media can be viewed" on storage.objects for select using (bucket_id = 'media');
create policy "users upload into own folder" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own media" on storage.objects for delete to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- PENTING: setelah file ini selesai, jalankan juga migration_v2.sql untuk
-- fitur Living Social (Sekilas, tipe jejak, laporan, dan ruang admin).
