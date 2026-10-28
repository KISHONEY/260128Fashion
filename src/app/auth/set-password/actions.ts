"use server";

// 이메일 초대로 들어온 사용자가 이름과 비밀번호를 정하는 서버 액션
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export async function setPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "초대 링크가 만료되었습니다. 교수님께 다시 요청해 주세요." };

  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  if (name.length < 1 || name.length > 40) return { error: "이름은 1~40자로 입력해 주세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };
  if (password !== password2) return { error: "비밀번호 확인이 일치하지 않습니다." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "비밀번호를 저장하지 못했습니다. 다른 비밀번호로 시도해 주세요." };

  await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
  redirect("/");
}
