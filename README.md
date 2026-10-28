# 연구 아카이브 — 패션디자인 연구실 아카이브 & 토론 웹사이트

교수의 연구 자료와 수업 자료를 한곳에 모으고, 초대받은 대학원생과 연구 결과를 토론하는 **비공개** 웹사이트입니다.

- 📘 **처음이라면** → [비개발자용 설정 가이드](docs/01-설정-가이드.md) (Supabase 가입부터 Vercel 배포까지)
- 🧭 **설치가 끝났다면** → [첫 사용 가이드](docs/02-첫-사용-가이드.md) (교수 계정, 학생 초대, 첫 연구 자료)
- 💡 **앞으로 더 해 볼 만한 것** → [확장 아이디어](docs/03-확장-아이디어.md)
- 🗄️ **데이터베이스 SQL 전체** → [`supabase/schema.sql`](supabase/schema.sql)

---

## 주요 기능

| 영역 | 내용 |
| --- | --- |
| 연구 자료 | 제목·요약·상세 설명(마크다운)·카테고리·태그·연도·상태(진행중/완료/발표/출판)·첨부 파일. 이미지 갤러리 / 목록 보기, 카테고리·태그·연도 필터, 키워드 검색 |
| 수업 자료 | 학기 › 과목 › 주차 탐색, PDF·PPT·이미지·외부 링크, 공개 대상(전체 멤버 / 교수만) |
| 토론 | 모든 자료 하단 댓글 (대댓글 1단계), 이미지 첨부, 마크다운, @멘션, 교수의 고정·삭제 |
| 연구실 라운지 | 자료와 무관한 자유 토론 게시판 |
| 알림 | 새 댓글·답글·멘션 사이트 내 알림, (선택) 멘션 이메일 알림 |
| 홈 | 교수 소개, 나를 부른 대화(멘션), 최근 연구, 최근 토론 |
| 관리 | 멤버 초대(초대 코드 / 이메일)·권한 변경·제거, 카테고리·태그 관리, 교수 소개 편집 |

## 보안 설계 요약

- **공개 회원가입 없음**: 초대 코드 또는 이메일 초대로만 가입. (Supabase에서 회원가입 기능 자체를 꺼 둡니다)
- **권한 검증은 데이터베이스(RLS)에서**: 화면을 우회해 API를 직접 호출해도 RLS 정책이 막습니다.
  - 비로그인: 모든 테이블·파일 조회 불가
  - 대학원생: 열람, 댓글 작성, 본인 댓글 수정·삭제, 라운지 글쓰기, 본인 폴더에만 이미지 업로드
  - 교수: 모든 자료 작성·수정·삭제, 모든 댓글 고정·삭제, 멤버 관리
- **파일도 비공개**: Storage 버킷이 private 이며 `/files/...` 경로가 로그인을 확인한 뒤에만 전달합니다. (문서는 60초짜리 일회용 주소)
- **업로드 제한**: 버킷 자체에 50MB·허용 형식 제한이 걸려 있고, 서버가 저장 전에 실제 파일 크기·형식을 다시 확인합니다.
- **개인정보 최소화**: 이름과 이메일만 저장합니다. 이메일은 Supabase Auth 에만 있으며 다른 학생에게 보이지 않습니다.
- `supabase/tests/` 에 RLS 동작을 검증하는 SQL 테스트가 있습니다.

## 기술 스택

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth, PostgreSQL, Storage, RLS) · Vercel

추가로 사용한 라이브러리와 이유:

| 라이브러리 | 이유 |
| --- | --- |
| `@supabase/supabase-js`, `@supabase/ssr` | Supabase 공식 클라이언트, 서버 렌더링에서 로그인 쿠키 처리 |
| `react-markdown`, `remark-gfm` | 마크다운을 **안전하게**(HTML 실행 없이) 표시. 직접 구현하면 보안 구멍(XSS)이 생기기 쉬움. gfm 은 표·자동 링크 지원 |
| `server-only` | 비밀키를 쓰는 코드가 실수로 브라우저에 포함되는 것을 빌드 단계에서 차단 (Next.js 공식 권장) |

이미지 리사이즈, 드래그앤드롭, 라이트박스, 멘션 자동완성, 이메일 발송(Resend API 직접 호출)은 외부 라이브러리 없이 구현했습니다.

## 폴더 구조

```
.
├── supabase/
│   ├── schema.sql                 # ★ Supabase SQL Editor 에 붙여 넣을 전체 SQL
│   └── tests/                     # 로컬 PostgreSQL 용 RLS 검증 스크립트
├── docs/                          # 설정 가이드, 첫 사용 가이드, 확장 아이디어
├── .env.example                   # 환경변수 예시 (복사해서 .env.local 로)
└── src/
    ├── proxy.ts                   # 모든 요청 전 로그인 확인 (비로그인 → /login)
    ├── app/
    │   ├── layout.tsx             # 글꼴, 공통 HTML
    │   ├── globals.css            # 디자인 토큰(색·서체), 마크다운 스타일
    │   ├── (auth)/login, join     # 로그인, 초대 코드 가입
    │   ├── auth/                  # 이메일 초대 확인, 비밀번호 설정, 로그아웃
    │   ├── files/[...path]/       # 로그인 확인 후 파일 전달
    │   └── (site)/                # 로그인 후 화면 (머리글·바닥글 공통)
    │       ├── page.tsx           # 홈 대시보드
    │       ├── research/          # 연구 자료 목록·상세·등록·수정
    │       ├── courses/           # 수업 자료
    │       ├── lounge/            # 연구실 라운지
    │       ├── notifications/     # 알림
    │       ├── settings/          # 내 정보 설정
    │       ├── admin/             # 관리 (멤버·초대, 카테고리·태그, 교수 소개)
    │       └── _actions/          # 댓글 서버 액션
    ├── components/                # 화면 조각 (업로더, 갤러리, 댓글, 마크다운 등)
    └── lib/
        ├── supabase/              # 브라우저·서버·관리자용 Supabase 클라이언트
        ├── auth.ts                # 현재 사용자 / 교수 확인
        ├── attachments.ts         # 첨부 파일 서버 검증 + 저장
        ├── upload-client.ts       # 브라우저 업로드 (이미지 리사이즈 포함)
        ├── image-resize.ts        # Canvas 로 이미지 축소
        ├── email.ts               # (선택) 멘션 이메일
        ├── constants.ts           # 한국어 라벨, 업로드 규칙
        └── types.ts               # 데이터 타입
```

## 개발자용 명령어

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build && npm run lint
```

RLS 테스트 (로컬 PostgreSQL 이 있을 때):

```bash
psql -d 테스트DB -f supabase/tests/00_supabase_stub.sql -f supabase/schema.sql -f supabase/tests/01_rls_test.sql
```
