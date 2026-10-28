-- =====================================================================
--  패션 연구 아카이브 — Supabase 전체 SQL
--  사용법: Supabase 대시보드 → SQL Editor → New query → 이 파일 전체를
--          붙여 넣고 [Run] 을 누르세요. 여러 번 실행해도 안전하도록
--          (재실행 가능하도록) 작성되어 있습니다.
--
--  구성
--   1. 열거형(enum) 타입
--   2. 테이블
--   3. 권한 확인용 함수 (RLS 에서 사용)
--   4. 트리거 (프로필 자동 생성, 수정 시각, 댓글 규칙, 알림 생성)
--   5. Row Level Security 정책  ← 모든 권한 검증은 여기서 이뤄집니다
--   6. Storage 버킷 + 파일 접근 정책
--   7. 초기 데이터 (카테고리 예시, 교수 소개 빈 행)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 열거형 타입
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'member');            -- 교수 / 대학원생
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.research_status as enum ('in_progress', 'completed', 'presented', 'published'); -- 진행중/완료/발표/출판
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.course_audience as enum ('members', 'admin_only'); -- 전체 멤버 공개 / 교수만(비공개)
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attachment_kind as enum ('image', 'pdf', 'document', 'link');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum ('comment', 'reply', 'mention');
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------
-- 2. 테이블
-- ---------------------------------------------------------------------

-- 회원 프로필: 개인정보는 이름만 저장합니다. (이메일은 Supabase Auth 에만 보관)
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  role          public.user_role not null default 'member',
  email_notify  boolean not null default true,   -- 멘션 이메일 알림 수신 여부
  created_at    timestamptz not null default now()
);

-- 교수 소개 (홈 화면) — 항상 한 행만 존재
create table if not exists public.site_settings (
  id              int primary key default 1 check (id = 1),
  name            text not null default '',
  title           text not null default '',     -- 직함/소속 (예: ○○대학교 패션디자인학과 교수)
  bio             text not null default '',     -- 소개 (마크다운)
  research_areas  text[] not null default '{}', -- 연구 분야
  email           text not null default '',     -- 공개 연락처
  office          text not null default '',     -- 연구실 위치 등
  photo_path      text,                         -- Storage 경로
  updated_at      timestamptz not null default now()
);

-- 연구 카테고리
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 40),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- 태그
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 30),
  created_at  timestamptz not null default now()
);

-- 연구 자료
create table if not exists public.research (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  summary      text not null default '' check (char_length(summary) <= 500),
  body         text not null default '' check (char_length(body) <= 50000), -- 상세 설명(마크다운)
  category_id  uuid references public.categories (id) on delete set null,
  year         int check (year between 1900 and 2200),
  status       public.research_status not null default 'in_progress',
  cover_path   text,   -- 대표 썸네일 경로 (첫 번째 이미지)
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists research_created_at_idx on public.research (created_at desc);
create index if not exists research_category_idx on public.research (category_id);
create index if not exists research_year_idx on public.research (year);

-- 연구 자료 ↔ 태그 (다대다)
create table if not exists public.research_tags (
  research_id  uuid not null references public.research (id) on delete cascade,
  tag_id       uuid not null references public.tags (id) on delete cascade,
  primary key (research_id, tag_id)
);
create index if not exists research_tags_tag_idx on public.research_tags (tag_id);

-- 수업 자료
create table if not exists public.course_materials (
  id           uuid primary key default gen_random_uuid(),
  semester     text not null check (char_length(semester) between 1 and 20),   -- 예: 2026-1
  course_name  text not null check (char_length(course_name) between 1 and 100),
  week         int check (week between 0 and 30),   -- 0 = 주차 없음(공통 자료)
  title        text not null check (char_length(title) between 1 and 200),
  description  text not null default '' check (char_length(description) <= 20000),
  audience     public.course_audience not null default 'members',
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists course_materials_nav_idx on public.course_materials (semester, course_name, week);

-- 연구실 라운지 (자유 토론 게시판)
create table if not exists public.lounge_posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 200),
  body        text not null default '' check (char_length(body) <= 20000),
  author_id   uuid references public.profiles (id) on delete set null,
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists lounge_posts_created_idx on public.lounge_posts (is_pinned desc, created_at desc);

-- 댓글 (연구 자료 / 수업 자료 / 라운지 글 중 정확히 한 곳에 달림)
create table if not exists public.comments (
  id                  uuid primary key default gen_random_uuid(),
  research_id         uuid references public.research (id) on delete cascade,
  course_material_id  uuid references public.course_materials (id) on delete cascade,
  lounge_post_id      uuid references public.lounge_posts (id) on delete cascade,
  parent_id           uuid references public.comments (id) on delete cascade, -- 대댓글이면 원 댓글
  author_id           uuid references public.profiles (id) on delete set null,
  body                text not null check (char_length(body) between 1 and 5000),
  is_pinned           boolean not null default false,
  edited              boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint comments_one_target check (num_nonnulls(research_id, course_material_id, lounge_post_id) = 1)
);
create index if not exists comments_research_idx on public.comments (research_id, created_at);
create index if not exists comments_course_idx on public.comments (course_material_id, created_at);
create index if not exists comments_lounge_idx on public.comments (lounge_post_id, created_at);
create index if not exists comments_recent_idx on public.comments (created_at desc);

-- 첨부 파일 (연구 자료 / 수업 자료 / 댓글 중 정확히 한 곳에 속함)
create table if not exists public.attachments (
  id                  uuid primary key default gen_random_uuid(),
  research_id         uuid references public.research (id) on delete cascade,
  course_material_id  uuid references public.course_materials (id) on delete cascade,
  comment_id          uuid references public.comments (id) on delete cascade,
  kind                public.attachment_kind not null,
  storage_path        text,   -- 원본(리사이즈된) 파일 경로
  thumb_path          text,   -- 이미지 썸네일 경로
  url                 text,   -- 외부 링크
  file_name           text not null default '' check (char_length(file_name) <= 255),
  mime_type           text,
  size_bytes          bigint check (size_bytes >= 0),
  width               int,
  height              int,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  constraint attachments_one_owner check (num_nonnulls(research_id, course_material_id, comment_id) = 1),
  constraint attachments_link_or_file check (
    (kind = 'link' and url ~* '^https?://' and storage_path is null)
    or (kind <> 'link' and storage_path is not null and url is null)
  )
);
create index if not exists attachments_research_idx on public.attachments (research_id, sort_order);
create index if not exists attachments_course_idx on public.attachments (course_material_id, sort_order);
create index if not exists attachments_comment_idx on public.attachments (comment_id);

-- 멘션 (@이름)
create table if not exists public.mentions (
  comment_id  uuid not null references public.comments (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  primary key (comment_id, user_id)
);
create index if not exists mentions_user_idx on public.mentions (user_id);

-- 알림
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade, -- 받는 사람
  actor_id    uuid references public.profiles (id) on delete set null,         -- 보낸 사람
  type        public.notification_type not null,
  comment_id  uuid references public.comments (id) on delete cascade,
  link        text not null,
  excerpt     text not null default '',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- 초대 코드
create table if not exists public.invite_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (char_length(code) between 6 and 40),
  role        public.user_role not null default 'member',
  max_uses    int not null default 1 check (max_uses between 1 and 200),
  use_count   int not null default 0,
  expires_at  timestamptz,
  note        text not null default '' check (char_length(note) <= 100),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 3. 권한 확인용 함수
--    security definer: RLS 를 우회해 profiles 를 조회하므로 정책 안에서
--    재귀 없이 사용할 수 있습니다. search_path 를 비워 보안을 강화합니다.
-- ---------------------------------------------------------------------

-- 로그인했고 프로필이 있는 사용자(=멤버)인가?
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- 교수(관리자)인가?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 이 수업 자료를 볼 수 있는가? (비공개 자료는 교수만)
create or replace function public.can_view_course(p_course_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or (public.is_member() and exists (
            select 1 from public.course_materials
            where id = p_course_id and audience = 'members'));
$$;

-- Storage 경로(courses/<id>/...)로 수업 자료 열람 가능 여부 확인
create or replace function public.can_view_course_path(p_segment text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  return public.can_view_course(p_segment::uuid);
exception when invalid_text_representation then
  return false;  -- uuid 형식이 아니면 거부
end $$;

-- 이 댓글을 볼 수 있는가? (비공개 수업 자료의 댓글은 교수만)
create or replace function public.can_view_comment(p_comment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_member() and exists (
    select 1 from public.comments c
    where c.id = p_comment_id
      and (c.course_material_id is null or public.can_view_course(c.course_material_id)));
$$;

-- 초대 코드 사용 (서버에서 service_role 키로만 호출)
-- 유효하면 사용 횟수를 1 올리고 부여할 역할을 돌려줍니다. 유효하지 않으면 null.
create or replace function public.claim_invite_code(p_code text)
returns public.user_role language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role;
begin
  update public.invite_codes
     set use_count = use_count + 1
   where code = p_code
     and use_count < max_uses
     and (expires_at is null or expires_at > now())
  returning role into v_role;
  return v_role;
end $$;

-- 가입 실패 시 초대 코드 사용 횟수 되돌리기 (service_role 전용)
create or replace function public.release_invite_code(p_code text)
returns void language sql security definer set search_path = '' as $$
  update public.invite_codes set use_count = greatest(use_count - 1, 0) where code = p_code;
$$;

revoke execute on function public.claim_invite_code(text) from public, anon, authenticated;
revoke execute on function public.release_invite_code(text) from public, anon, authenticated;
grant execute on function public.claim_invite_code(text) to service_role;
grant execute on function public.release_invite_code(text) to service_role;

-- 서버(service_role 키)나 SQL 편집기에서 실행 중인가?
-- (security definer 함수 안에서는 current_user 가 함수 소유자로 바뀌므로
--  요청의 JWT 역할로 판단합니다. 일반 사용자는 'authenticated' / 'anon')
create or replace function public.is_backend()
returns boolean language sql stable set search_path = '' as $$
  select coalesce(auth.role(), 'none') not in ('anon', 'authenticated');
$$;


-- ---------------------------------------------------------------------
-- 4. 트리거
-- ---------------------------------------------------------------------

-- (1) 새 계정이 만들어지면 프로필 자동 생성
--     ★ 사이트의 "첫 번째" 계정은 자동으로 교수(admin)가 됩니다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  if v_name is null then
    v_name := split_part(coalesce(new.email, '회원'), '@', 1);
  end if;
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(v_name, 40),
    case when exists (select 1 from public.profiles where role = 'admin')
         then 'member'::public.user_role else 'admin'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- (2) 프로필 보호: 역할(role)은 교수만 바꿀 수 있고, 마지막 교수는 강등 불가
create or replace function public.protect_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.id <> old.id then
    raise exception '프로필 ID 는 변경할 수 없습니다.';
  end if;
  if new.role <> old.role then
    if not (public.is_admin() or public.is_backend()) then
      raise exception '역할은 교수(관리자)만 변경할 수 있습니다.';
    end if;
    if old.role = 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception '마지막 관리자의 권한은 해제할 수 없습니다.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- (3) updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists research_updated_at on public.research;
create trigger research_updated_at before update on public.research
  for each row execute function public.set_updated_at();
drop trigger if exists course_materials_updated_at on public.course_materials;
create trigger course_materials_updated_at before update on public.course_materials
  for each row execute function public.set_updated_at();
drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- (4) 라운지 글 규칙: 고정은 교수만, 본문 수정은 작성자만
create or replace function public.guard_lounge_post()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_backend() then return new; end if;
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    if new.is_pinned and not public.is_admin() then
      new.is_pinned := false;
    end if;
  else
    new.author_id := old.author_id;
    new.created_at := old.created_at;
    if new.is_pinned <> old.is_pinned and not public.is_admin() then
      raise exception '게시글 고정은 교수만 할 수 있습니다.';
    end if;
    if (new.title <> old.title or new.body <> old.body) then
      if old.author_id is distinct from auth.uid() then
        raise exception '본인이 쓴 글만 수정할 수 있습니다.';
      end if;
      new.updated_at := now();
    end if;
  end if;
  return new;
end $$;

drop trigger if exists lounge_posts_guard on public.lounge_posts;
create trigger lounge_posts_guard before insert or update on public.lounge_posts
  for each row execute function public.guard_lounge_post();

-- (5) 댓글 규칙
--   - 작성자는 항상 로그인한 본인
--   - 대댓글은 1단계까지만 (답글에 답글 불가), 같은 자료 안에서만
--   - 고정(핀)은 교수만
--   - 본문 수정은 작성자 본인만 (교수는 삭제만 가능)
create or replace function public.guard_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  p public.comments%rowtype;
begin
  if public.is_backend() then return new; end if;

  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    new.edited := false;
    if new.is_pinned and not public.is_admin() then
      new.is_pinned := false;
    end if;
    if new.parent_id is not null then
      select * into p from public.comments where id = new.parent_id;
      if not found then
        raise exception '원 댓글을 찾을 수 없습니다.';
      end if;
      if p.parent_id is not null then
        raise exception '답글에는 다시 답글을 달 수 없습니다.';
      end if;
      if p.research_id is distinct from new.research_id
         or p.course_material_id is distinct from new.course_material_id
         or p.lounge_post_id is distinct from new.lounge_post_id then
        raise exception '원 댓글과 같은 자료에만 답글을 달 수 있습니다.';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE: 바꿀 수 없는 칼럼은 원래 값으로 고정
  new.research_id := old.research_id;
  new.course_material_id := old.course_material_id;
  new.lounge_post_id := old.lounge_post_id;
  new.parent_id := old.parent_id;
  new.author_id := old.author_id;
  new.created_at := old.created_at;

  if new.is_pinned <> old.is_pinned and not public.is_admin() then
    raise exception '댓글 고정은 교수만 할 수 있습니다.';
  end if;
  if new.body <> old.body then
    if old.author_id is distinct from auth.uid() then
      raise exception '본인이 쓴 댓글만 수정할 수 있습니다.';
    end if;
    new.edited := true;
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists comments_guard on public.comments;
create trigger comments_guard before insert or update on public.comments
  for each row execute function public.guard_comment();

-- 댓글이 달린 페이지 주소 계산
create or replace function public.comment_link(c public.comments)
returns text language sql immutable set search_path = '' as $$
  select case
    when c.research_id is not null then '/research/' || c.research_id
    when c.course_material_id is not null then '/courses/' || c.course_material_id
    else '/lounge/' || c.lounge_post_id
  end || '#comment-' || c.id;
$$;

-- 해당 사용자가 이 댓글을 볼 수 있는지 (알림 대상 판정용, 특정 사용자 기준)
create or replace function public.user_can_view_comment(p_user uuid, c public.comments)
returns boolean language sql stable security definer set search_path = '' as $$
  select c.course_material_id is null
      or exists (select 1 from public.profiles where id = p_user and role = 'admin')
      or exists (select 1 from public.course_materials
                 where id = c.course_material_id and audience = 'members');
$$;

-- (6) 새 댓글 알림
--   - 답글: 원 댓글 작성자에게
--   - 연구/수업 자료의 새 댓글: 교수(관리자)에게
--   - 라운지 글의 새 댓글: 글쓴이에게
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_link text := public.comment_link(new);
  v_excerpt text := left(regexp_replace(new.body, '\s+', ' ', 'g'), 140);
  v_parent_author uuid;
  v_post_author uuid;
begin
  if new.parent_id is not null then
    select author_id into v_parent_author from public.comments where id = new.parent_id;
    if v_parent_author is not null and v_parent_author is distinct from new.author_id then
      insert into public.notifications (user_id, actor_id, type, comment_id, link, excerpt)
      values (v_parent_author, new.author_id, 'reply', new.id, v_link, v_excerpt);
    end if;
  elsif new.lounge_post_id is not null then
    select author_id into v_post_author from public.lounge_posts where id = new.lounge_post_id;
    if v_post_author is not null and v_post_author is distinct from new.author_id then
      insert into public.notifications (user_id, actor_id, type, comment_id, link, excerpt)
      values (v_post_author, new.author_id, 'comment', new.id, v_link, v_excerpt);
    end if;
  else
    insert into public.notifications (user_id, actor_id, type, comment_id, link, excerpt)
    select p.id, new.author_id, 'comment', new.id, v_link, v_excerpt
      from public.profiles p
     where p.role = 'admin' and p.id is distinct from new.author_id;
  end if;
  return new;
end $$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_on_comment();

-- (7) 멘션 알림
create or replace function public.notify_on_mention()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c public.comments%rowtype;
begin
  select * into c from public.comments where id = new.comment_id;
  if not found or c.author_id is not distinct from new.user_id then
    return new;  -- 자기 자신 멘션은 알림 없음
  end if;
  if not public.user_can_view_comment(new.user_id, c) then
    return new;  -- 볼 수 없는 자료라면 알림 없음
  end if;
  insert into public.notifications (user_id, actor_id, type, comment_id, link, excerpt)
  values (new.user_id, c.author_id, 'mention', c.id, public.comment_link(c),
          left(regexp_replace(c.body, '\s+', ' ', 'g'), 140));
  return new;
end $$;

drop trigger if exists mentions_notify on public.mentions;
create trigger mentions_notify after insert on public.mentions
  for each row execute function public.notify_on_mention();


-- ---------------------------------------------------------------------
-- 5. Row Level Security (RLS)
--    로그인하지 않은 사용자(anon)에게는 어떤 정책도 없으므로
--    모든 테이블이 "아무것도 보이지 않음" 상태가 됩니다.
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.site_settings     enable row level security;
alter table public.categories        enable row level security;
alter table public.tags              enable row level security;
alter table public.research          enable row level security;
alter table public.research_tags     enable row level security;
alter table public.course_materials  enable row level security;
alter table public.lounge_posts      enable row level security;
alter table public.comments          enable row level security;
alter table public.attachments       enable row level security;
alter table public.mentions          enable row level security;
alter table public.notifications     enable row level security;
alter table public.invite_codes      enable row level security;

-- profiles: 멤버끼리 이름은 서로 볼 수 있음(멘션용). 본인 또는 교수만 수정.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
  using (public.is_member());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- (insert 는 트리거가, delete 는 서버의 계정 삭제가 담당하므로 정책 없음)

-- site_settings: 멤버 열람, 교수 수정
drop policy if exists "site_settings_select" on public.site_settings;
create policy "site_settings_select" on public.site_settings for select to authenticated
  using (public.is_member());
drop policy if exists "site_settings_update" on public.site_settings;
create policy "site_settings_update" on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- categories / tags: 멤버 열람, 교수만 추가·수정·삭제
drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories for select to authenticated
  using (public.is_member());
drop policy if exists "categories_admin" on public.categories;
create policy "categories_admin" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tags_select" on public.tags;
create policy "tags_select" on public.tags for select to authenticated
  using (public.is_member());
drop policy if exists "tags_admin" on public.tags;
create policy "tags_admin" on public.tags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- research / research_tags: 멤버 열람, 교수만 쓰기
drop policy if exists "research_select" on public.research;
create policy "research_select" on public.research for select to authenticated
  using (public.is_member());
drop policy if exists "research_admin" on public.research;
create policy "research_admin" on public.research for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "research_tags_select" on public.research_tags;
create policy "research_tags_select" on public.research_tags for select to authenticated
  using (public.is_member());
drop policy if exists "research_tags_admin" on public.research_tags;
create policy "research_tags_admin" on public.research_tags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- course_materials: 공개 대상에 따라 열람, 교수만 쓰기
drop policy if exists "course_materials_select" on public.course_materials;
create policy "course_materials_select" on public.course_materials for select to authenticated
  using (public.is_admin() or (public.is_member() and audience = 'members'));
drop policy if exists "course_materials_admin" on public.course_materials;
create policy "course_materials_admin" on public.course_materials for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- lounge_posts: 멤버 열람·작성, 작성자 또는 교수가 수정·삭제 (세부 규칙은 트리거)
drop policy if exists "lounge_select" on public.lounge_posts;
create policy "lounge_select" on public.lounge_posts for select to authenticated
  using (public.is_member());
drop policy if exists "lounge_insert" on public.lounge_posts;
create policy "lounge_insert" on public.lounge_posts for insert to authenticated
  with check (public.is_member() and author_id = auth.uid());
drop policy if exists "lounge_update" on public.lounge_posts;
create policy "lounge_update" on public.lounge_posts for update to authenticated
  using (public.is_member() and (author_id = auth.uid() or public.is_admin()))
  with check (public.is_member());
drop policy if exists "lounge_delete" on public.lounge_posts;
create policy "lounge_delete" on public.lounge_posts for delete to authenticated
  using (public.is_member() and (author_id = auth.uid() or public.is_admin()));

-- comments: 볼 수 있는 자료의 댓글만 열람·작성, 작성자 또는 교수가 수정·삭제
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments for select to authenticated
  using (public.is_member()
         and (course_material_id is null or public.can_view_course(course_material_id)));
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert to authenticated
  with check (public.is_member()
              and author_id = auth.uid()
              and (course_material_id is null or public.can_view_course(course_material_id)));
drop policy if exists "comments_update" on public.comments;
create policy "comments_update" on public.comments for update to authenticated
  using (public.is_member() and (author_id = auth.uid() or public.is_admin()))
  with check (public.is_member());
drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments for delete to authenticated
  using (public.is_member() and (author_id = auth.uid() or public.is_admin()));

-- attachments: 연결된 자료를 볼 수 있으면 열람
--   연구/수업 자료 첨부는 교수만, 댓글 이미지는 댓글 작성자만 추가
drop policy if exists "attachments_select" on public.attachments;
create policy "attachments_select" on public.attachments for select to authenticated
  using (public.is_member() and (
           research_id is not null
        or (course_material_id is not null and public.can_view_course(course_material_id))
        or (comment_id is not null and public.can_view_comment(comment_id))));
drop policy if exists "attachments_insert" on public.attachments;
create policy "attachments_insert" on public.attachments for insert to authenticated
  with check (
    (public.is_admin() and (research_id is not null or course_material_id is not null)
       and (storage_path is null
            or storage_path like 'research/' || research_id::text || '/%'
            or storage_path like 'courses/' || course_material_id::text || '/%'))
    or (comment_id is not null
        and exists (select 1 from public.comments c
                    where c.id = comment_id and c.author_id = auth.uid())
        and kind = 'image'
        and storage_path like 'comments/' || auth.uid()::text || '/%'));
drop policy if exists "attachments_update" on public.attachments;
create policy "attachments_update" on public.attachments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "attachments_delete" on public.attachments;
create policy "attachments_delete" on public.attachments for delete to authenticated
  using (public.is_admin()
         or (comment_id is not null and exists (
               select 1 from public.comments c
               where c.id = comment_id and c.author_id = auth.uid())));

-- mentions: 볼 수 있는 댓글의 멘션만 열람, 댓글 작성자만 추가
drop policy if exists "mentions_select" on public.mentions;
create policy "mentions_select" on public.mentions for select to authenticated
  using (public.can_view_comment(comment_id));
drop policy if exists "mentions_insert" on public.mentions;
create policy "mentions_insert" on public.mentions for insert to authenticated
  with check (exists (select 1 from public.comments c
                      where c.id = comment_id and c.author_id = auth.uid()));

-- notifications: 본인 알림만 열람·읽음 처리·삭제 (생성은 트리거만)
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- invite_codes: 교수만
drop policy if exists "invite_codes_admin" on public.invite_codes;
create policy "invite_codes_admin" on public.invite_codes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 6. Storage (파일 저장소)
--    비공개(private) 버킷 'archive' 하나를 사용합니다.
--    - 파일 크기 제한 50MB, 허용 형식 제한 → Supabase 서버가 직접 거부
--    - 폴더 구조
--        research/<연구ID>/...      연구 자료 첨부 (교수만 업로드)
--        courses/<수업자료ID>/...   수업 자료 첨부 (교수만 업로드)
--        comments/<사용자ID>/...    댓글 이미지 (본인 폴더만 업로드)
--        site/...                   교수 사진 등 (교수만 업로드)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'archive', 'archive', false, 52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp',
    'application/vnd.hancom.hwpx',
    'text/plain'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 열람: 멤버만. 비공개 수업 자료 폴더는 교수만.
drop policy if exists "archive_select" on storage.objects;
create policy "archive_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'archive'
    and public.is_member()
    and (
      (storage.foldername(name))[1] in ('research', 'site', 'comments')
      or ((storage.foldername(name))[1] = 'courses'
          and public.can_view_course_path((storage.foldername(name))[2]))
      or public.is_admin()
    )
  );

-- 업로드: 교수는 전부, 멤버는 comments/<본인ID>/ 폴더만
drop policy if exists "archive_insert" on storage.objects;
create policy "archive_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'archive'
    and (
      public.is_admin()
      or (public.is_member()
          and (storage.foldername(name))[1] = 'comments'
          and (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

drop policy if exists "archive_update" on storage.objects;
create policy "archive_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'archive'
    and (public.is_admin()
         or ((storage.foldername(name))[1] = 'comments'
             and (storage.foldername(name))[2] = auth.uid()::text))
  );

drop policy if exists "archive_delete" on storage.objects;
create policy "archive_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'archive'
    and (public.is_admin()
         or ((storage.foldername(name))[1] = 'comments'
             and (storage.foldername(name))[2] = auth.uid()::text))
  );


-- ---------------------------------------------------------------------
-- 7. 초기 데이터
-- ---------------------------------------------------------------------
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

insert into public.categories (name, sort_order) values
  ('지속가능 패션', 1),
  ('의복 구성/패턴', 2),
  ('패션 트렌드', 3),
  ('소재/텍스타일', 4),
  ('패션 문화사', 5)
on conflict (name) do nothing;

-- 끝. "Success. No rows returned" 가 보이면 완료입니다.
