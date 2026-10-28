"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

// 로그인 이후 이동할 주소가 사이트 내부 주소인지 확인 (외부 사이트로 튕기는 공격 방지)
function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "이메일과 비밀번호를 모두 입력해 주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("invalid login")) {
      return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "이메일 인증이 아직 완료되지 않았습니다. 초대 메일의 링크를 먼저 눌러 주세요." };
    }
    return { error: "로그인하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  redirect(safeNext(formData.get("next")));
}
