"use server";

// 초대 코드로 가입하기
// 초대 코드 확인·사용 처리·역할 부여는 모두 데이터베이스 트리거(gate_new_user)가 합니다.
// 그래서 누군가 가입 API 를 직접 호출해도 유효한 코드가 없으면 계정이 만들어지지 않습니다.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export async function joinWithCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");

  // 1) 입력값 검사 (서버에서 다시 확인)
  if (!code) return { error: "초대 코드를 입력해 주세요." };
  if (name.length < 1 || name.length > 40) return { error: "이름은 1~40자로 입력해 주세요." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "이메일 형식이 올바르지 않습니다." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };
  if (password !== password2) return { error: "비밀번호 확인이 일치하지 않습니다." };

  const supabase = await createClient();

  // 2) 코드가 유효한지 먼저 확인 (친절한 오류 안내용 — 실제 검증은 DB 트리거)
  const { data: valid } = await supabase.rpc("check_invite_code", { p_code: code });
  if (!valid) return { error: "유효하지 않거나 만료된 초대 코드입니다." };

  // 3) 가입 (DB 트리거가 코드를 사용 처리하고 역할을 부여)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name, invite_code: code } },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("exists")) {
      return { error: "이미 가입된 이메일입니다. 로그인 화면에서 로그인해 주세요." };
    }
    if (msg.includes("password")) {
      return { error: "비밀번호가 너무 단순합니다. 다른 비밀번호를 사용해 주세요." };
    }
    if (msg.includes("signups not allowed") || msg.includes("signup is disabled")) {
      return { error: "Supabase 에서 회원가입이 꺼져 있습니다. 설정 가이드 3단계를 확인해 주세요." };
    }
    if (msg.includes("database error")) {
      return { error: "유효하지 않거나 이미 사용된 초대 코드입니다." };
    }
    if (msg.includes("rate limit")) {
      return { error: "잠시 후 다시 시도해 주세요. (요청이 너무 많습니다)" };
    }
    console.error("signUp", error);
    return { error: "가입하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  // 4) 이메일 인증이 켜져 있으면 세션이 바로 생기지 않음
  if (!data.session) {
    return {
      success:
        "가입 신청이 완료되었습니다. 받은 편지함의 인증 메일을 확인해 주세요. (메일이 오지 않으면 교수님께 문의하세요)",
    };
  }
  redirect("/");
}
