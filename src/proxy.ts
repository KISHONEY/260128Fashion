// Next.js Proxy(구 middleware): 모든 페이지 요청 전에 실행됩니다.
// 로그인하지 않은 방문자는 로그인 페이지로 이동시킵니다.
// ※ 실제 데이터 보호는 Supabase RLS 가 담당하며, 이것은 1차 관문입니다.
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Next.js 내부 정적 파일과 파비콘만 제외 (/files/* 업로드 파일은 반드시 검사)
    "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
