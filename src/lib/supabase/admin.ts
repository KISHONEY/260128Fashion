// 관리자 전용 Supabase 클라이언트 (Secret / service_role 키 사용)
// ⚠️ RLS 를 우회하므로 반드시 서버에서만, 그리고 권한 확인 후에만 사용합니다.
//    사용처: 초대 코드 가입, 이메일 초대, 멤버 삭제, 멤버 이메일 조회
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "환경변수 SUPABASE_SECRET_KEY 가 설정되지 않았습니다. 설정 가이드를 확인하세요.",
    );
  }
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
