-- RLS 동작 검증 (로컬 PostgreSQL + 00_supabase_stub.sql 환경 전용)
\set ON_ERROR_STOP 1
-- 계정 3개: 교수는 schema.sql 이 만든 "최초 교수 가입 코드", 학생은 일반 초대 코드로 가입
insert into public.invite_codes (code, role, max_uses) values ('STUDENT1', 'member', 2);
insert into auth.users (id, email, raw_user_meta_data)
select '00000000-0000-0000-0000-00000000000a', 'prof@example.com',
       jsonb_build_object('display_name', '김교수', 'invite_code', lower(code))
from public.invite_codes where note = '최초 교수 계정';
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000b', 'stu1@example.com', '{"display_name":"이학생","invite_code":"STUDENT1","invited_role":"admin"}'),
  ('00000000-0000-0000-0000-00000000000c', 'stu2@example.com', '{"invite_code":"student1"}');
select display_name, role from public.profiles order by display_name;
select 'emails recorded (expect 3)', count(*) from public.member_emails;
select 'invite code stripped from metadata (expect 0)', count(*) from auth.users where raw_user_meta_data ? 'invite_code';

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', u, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end $$;
create or replace function pg_temp.expect_error(q text, label text) returns void language plpgsql as $$
begin
  execute q;
  raise exception 'FAIL (should have errored): %', label;
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'OK  %  -> %', label, sqlerrm;
end $$;

-- 1) 비로그인(anon): 아무것도 안 보임
begin;
set local role anon;
set local request.jwt.claim.role = 'anon';
select 'anon research', count(*) from public.research;
select 'anon categories', count(*) from public.categories;
select 'anon storage', count(*) from storage.objects;
rollback;

-- 2) 교수: 연구자료 작성, 비공개 수업자료 작성
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.research (id, title, year, created_by) values ('11111111-1111-1111-1111-111111111111', '업사이클링 연구', 2026, auth.uid());
insert into public.course_materials (id, semester, course_name, week, title, audience) values
  ('22222222-2222-2222-2222-222222222222', '2026-2', '패션디자인연구', 1, '비공개 자료', 'admin_only'),
  ('33333333-3333-3333-3333-333333333333', '2026-2', '패션디자인연구', 2, '공개 자료', 'members');
insert into public.attachments (research_id, kind, storage_path, file_name) values ('11111111-1111-1111-1111-111111111111','image','research/11111111-1111-1111-1111-111111111111/a.jpg','a.jpg');
insert into storage.objects (bucket_id, name) values
  ('archive', 'research/11111111-1111-1111-1111-111111111111/a.jpg'),
  ('archive', 'courses/22222222-2222-2222-2222-222222222222/secret.pdf'),
  ('archive', 'courses/33333333-3333-3333-3333-333333333333/open.pdf');
commit;

-- 3) 학생: 열람 가능/불가 확인
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select 'student research', count(*) from public.research;
select 'student courses (expect 1)', count(*) from public.course_materials;
select 'student storage (expect 2)', count(*) from storage.objects;
select pg_temp.expect_error($q$insert into public.research (title) values ('학생이 쓴 연구')$q$, 'student cannot insert research');
select pg_temp.expect_error($q$insert into storage.objects (bucket_id, name) values ('archive','research/x/evil.jpg')$q$, 'student cannot upload to research/');
insert into storage.objects (bucket_id, name) values ('archive','comments/00000000-0000-0000-0000-00000000000b/ok.jpg');
select pg_temp.expect_error($q$insert into storage.objects (bucket_id, name) values ('archive','comments/00000000-0000-0000-0000-00000000000c/evil.jpg')$q$, 'student cannot upload to other folder');
select pg_temp.expect_error($q$update public.profiles set role='admin' where id = auth.uid()$q$, 'student cannot self-promote');
update public.profiles set display_name = '이학생2' where id = auth.uid();
with u as (update public.profiles set display_name = 'hack' where id = '00000000-0000-0000-0000-00000000000c' returning 1)
select 'student updates others (expect 0)', count(*) from u;
-- 댓글
insert into public.comments (id, research_id, body, author_id) values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','좋은 연구입니다 @김교수', auth.uid());
insert into public.mentions (comment_id, user_id) values ('44444444-4444-4444-4444-444444444444','00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($q$insert into public.comments (course_material_id, body, author_id) values ('22222222-2222-2222-2222-222222222222','비공개에 댓글', auth.uid())$q$, 'student cannot comment on private course');
select pg_temp.expect_error($q$update public.comments set is_pinned = true where id='44444444-4444-4444-4444-444444444444'$q$, 'student cannot pin');
-- 다른 사람 ID 로 써도 트리거가 작성자를 본인으로 바꿈 (expect t)
with ins as (insert into public.comments (research_id, body, author_id) values ('11111111-1111-1111-1111-111111111111','사칭','00000000-0000-0000-0000-00000000000a') returning author_id)
select 'impersonation rewritten to self', author_id = auth.uid() from ins;
select pg_temp.expect_error($q$insert into public.notifications (user_id, type, link) values ('00000000-0000-0000-0000-00000000000a','comment','/')$q$, 'student cannot insert notifications');
select 'student invite codes (expect 0)', count(*) from public.invite_codes;
commit;

-- 4) 학생2: 답글, 남의 댓글 수정 불가, 답글의 답글 불가
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.comments (id, research_id, parent_id, body) values ('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','동의합니다');
select pg_temp.expect_error($q$insert into public.comments (research_id, parent_id, body) values ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','3단계')$q$, 'no nested replies');
with u as (update public.comments set body='수정' where id='44444444-4444-4444-4444-444444444444' returning 1)
select 'student2 edit others (expect 0)', count(*) from u;
with d as (delete from public.comments where id='44444444-4444-4444-4444-444444444444' returning 1)
select 'student2 delete others (expect 0)', count(*) from d;
commit;

-- 5) 교수: 알림 확인, 핀, 학생 댓글 삭제 가능, 본문 수정은 불가
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select 'prof notifications', type, excerpt, link from public.notifications order by created_at;
update public.comments set is_pinned = true where id='44444444-4444-4444-4444-444444444444';
select pg_temp.expect_error($q$update public.comments set body='교수가 수정' where id='44444444-4444-4444-4444-444444444444'$q$, 'admin cannot edit others body');
select 'prof storage (expect 4)', count(*) from storage.objects;
commit;

begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select 'student1 notifications (reply expected)', type, link from public.notifications;
select 'student1 sees other notifications? (expect 0)', count(*) from public.notifications where user_id <> auth.uid();
commit;

-- 7) 마지막 관리자 강등 방지
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($q$update public.profiles set role='member' where id = auth.uid()$q$, 'last admin cannot be demoted');
rollback;
-- 8) 가입 관문: 코드 없음 / 다 쓴 코드 / 틀린 코드 → 거부
select pg_temp.expect_error($q$insert into auth.users (email, raw_user_meta_data) values ('x@x.com', '{}')$q$, 'signup without code rejected');
select pg_temp.expect_error($q$insert into auth.users (email, raw_user_meta_data) values ('x@x.com', '{"invite_code":"STUDENT1"}')$q$, 'used-up code rejected');
select pg_temp.expect_error($q$insert into auth.users (email, raw_user_meta_data) values ('x@x.com', '{"invite_code":"NOPE"}')$q$, 'wrong code rejected');
begin;
set local role anon;
set local request.jwt.claim.role = 'anon';
select 'anon check valid code (expect f, used up)', public.check_invite_code('student1');
select 'anon cannot read emails (expect 0)', count(*) from public.member_emails;
rollback;

-- 9) 학생은 이메일 목록을 볼 수 없고(본인 것만), 교수는 멤버를 제거할 수 있음
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select 'student sees own email only (expect 1)', count(*) from public.member_emails;
with d as (delete from public.profiles where id = '00000000-0000-0000-0000-00000000000c' returning 1)
select 'student cannot remove member (expect 0)', count(*) from d;
rollback;
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select 'admin sees all emails (expect 3)', count(*) from public.member_emails;
with d as (delete from public.profiles where id = auth.uid() returning 1)
select 'admin cannot remove self (expect 0)', count(*) from d;
with d as (delete from public.profiles where id = '00000000-0000-0000-0000-00000000000c' returning 1)
select 'admin removes member (expect 1)', count(*) from d;
rollback;
select 'ALL TESTS DONE';
