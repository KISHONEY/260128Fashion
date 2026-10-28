// 브라우저(클라이언트 컴포넌트)에서 쓰는 Supabase 클라이언트
// 주로 파일을 Storage 로 직접 업로드할 때 사용합니다.
// 권한은 로그인 세션 + Supabase RLS 정책으로 서버에서 검사됩니다.
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
