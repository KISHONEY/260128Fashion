// 로그인 사용자 확인 도우미 (서버 전용)
// 화면 표시용 확인입니다. 실제 데이터 접근 권한은 Supabase RLS 가 최종 판단합니다.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type CurrentUser = Profile & { email: string };

// 한 번의 요청 안에서는 결과를 재사용합니다 (React cache)
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", claims.sub)
    .maybeSingle<Profile>();
  if (!profile) return null; // 프로필이 없는(삭제된) 계정

  return { ...profile, email: (claims.email as string | undefined) ?? "" };
});

// 로그인 필수 — 아니면 로그인 화면으로
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// 교수(관리자) 필수 — 아니면 홈으로
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

// 서버 액션 안에서 쓰는 버전: 리다이렉트 대신 오류 메시지를 돌려줍니다.
export async function actionUser(): Promise<CurrentUser | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다. 다시 로그인해 주세요." };
  return user;
}

export async function actionAdmin(): Promise<CurrentUser | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다. 다시 로그인해 주세요." };
  if (user.role !== "admin") return { error: "교수(관리자)만 할 수 있는 작업입니다." };
  return user;
}
