// 서버(서버 컴포넌트, 서버 액션, 라우트 핸들러)에서 쓰는 Supabase 클라이언트
// 로그인한 사용자의 쿠키를 그대로 사용하므로, 모든 조회/수정에
// 해당 사용자의 RLS 권한이 적용됩니다.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없습니다.
          // 세션 갱신은 proxy.ts 가 담당하므로 무시해도 안전합니다.
        }
      },
    },
  });
}
