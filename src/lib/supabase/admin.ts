// (선택) 관리자 전용 Supabase 클라이언트 — Secret 키가 있을 때만 사용
// 기본 기능은 Secret 키 없이 모두 동작합니다. Secret 키를 환경변수
// SUPABASE_SECRET_KEY 로 넣으면 아래 추가 기능이 켜집니다.
//   - 이메일로 초대 메일 보내기
//   - 멤버 제거 시 로그인 계정까지 완전히 삭제
//   - (RESEND_API_KEY 와 함께) 멘션 이메일 알림
// ⚠️ RLS 를 우회하므로 반드시 서버에서만, 권한 확인 후에만 사용합니다.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

export function hasAdminKey() {
  return Boolean(process.env.SUPABASE_SECRET_KEY);
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY 가 설정되지 않았습니다.");
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
