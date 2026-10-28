"use server";

// 초대 코드로 가입하기
// 공개 회원가입은 Supabase 설정에서 꺼 두고, 이 서버 액션만이
// "유효한 초대 코드"를 확인한 뒤 Secret 키로 계정을 만듭니다.
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, UserRole } from "@/lib/types";

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

  const admin = createAdminClient();

  // 2) 초대 코드 사용 (유효하면 역할을 돌려받음, 동시에 사용 횟수 +1)
  const { data: role, error: claimError } = await admin.rpc("claim_invite_code", { p_code: code });
  if (claimError) return { error: "초대 코드를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  if (!role) return { error: "유효하지 않거나 만료된 초대 코드입니다." };

  // 3) 계정 생성 (이메일 인증 완료 상태로)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (createError || !created.user) {
    await admin.rpc("release_invite_code", { p_code: code }); // 코드 사용 취소
    const msg = createError?.message.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("exists")) {
      return { error: "이미 가입된 이메일입니다. 로그인 화면에서 로그인해 주세요." };
    }
    if (msg.includes("password")) {
      return { error: "비밀번호가 너무 단순합니다. 다른 비밀번호를 사용해 주세요." };
    }
    return { error: "가입하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  // 4) 초대 코드에 지정된 역할 부여 (기본은 대학원생)
  if ((role as UserRole) === "admin") {
    await admin.from("profiles").update({ role: "admin" }).eq("id", created.user.id);
  }

  // 5) 바로 로그인
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) redirect("/login");
  redirect("/");
}
