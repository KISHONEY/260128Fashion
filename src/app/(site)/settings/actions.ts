"use server";

// 내 정보 설정: 이름, 멘션 이메일 알림, 비밀번호
import { revalidatePath } from "next/cache";
import { actionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionUser();
  if ("error" in me) return me;
  const name = String(formData.get("display_name") ?? "").trim();
  const emailNotify = formData.get("email_notify") === "on";
  if (name.length < 1 || name.length > 40) return { error: "이름은 1~40자로 입력해 주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name, email_notify: emailNotify })
    .eq("id", me.id);
  if (error) return { error: "저장하지 못했습니다." };
  revalidatePath("/", "layout");
  return { success: "저장했습니다." };
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionUser();
  if ("error" in me) return me;
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };
  if (password !== password2) return { error: "비밀번호 확인이 일치하지 않습니다." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "비밀번호를 바꾸지 못했습니다. 다른 비밀번호로 시도해 주세요." };
  return { success: "비밀번호를 변경했습니다." };
}
