// =====================================================================
//  ★ 사이트 설정 — 이 파일의 두 값만 바꾸면 됩니다 (환경변수 불필요)
//
//  Supabase 대시보드 → Project Settings 에서 복사해 따옴표 안에 붙여 넣으세요.
//   1) SUPABASE_URL:  Data API (또는 API) → Project URL
//   2) SUPABASE_PUBLISHABLE_KEY:  API Keys → Publishable key (sb_publishable_…)
//      (예전 화면이라면 "anon public" 키)
//
//  이 두 값은 원래 브라우저에 공개되도록 만들어진 값이라 코드에 넣어도 안전합니다.
//  데이터 보호는 Supabase 의 RLS(권한 규칙)가 담당합니다.
//
//  ⚠️ "Secret key"(sb_secret_…, service_role) 는 절대 여기에 넣지 마세요!
// =====================================================================

export const SUPABASE_URL = "https://여기에-프로젝트주소.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_여기에-공개키";
