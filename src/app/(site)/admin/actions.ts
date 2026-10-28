"use server";

// 관리자(교수) 전용 서버 액션
// - 모든 함수는 먼저 actionAdmin() 으로 교수인지 확인합니다.
// - 일반 데이터 변경은 로그인 사용자 권한(RLS)으로,
//   계정 생성/삭제·이메일 조회처럼 Auth 관리가 필요한 경우에만 Secret 키를 씁니다.
import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { actionAdmin } from "@/lib/auth";
import { BUCKET } from "@/lib/constants";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, UserRole } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES: UserRole[] = ["admin", "member"];

// ------------------------------------------------------------------
// 멤버 관리
// ------------------------------------------------------------------

export async function changeRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionAdmin();
  if ("error" in me) return me;
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!UUID_RE.test(id) || !ROLES.includes(role)) return { error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) {
    if (error.message.includes("마지막")) return { error: error.message };
    return { error: "권한을 변경하지 못했습니다." };
  }
  revalidatePath("/admin");
  return { success: "권한을 변경했습니다." };
}

export async function removeMember(formData: FormData) {
  const me = await actionAdmin();
  if ("error" in me) return;
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id) || id === me.id) return; // 본인은 삭제 불가

  const admin = createAdminClient();
  // 마지막 교수 계정은 삭제 불가
  const { data: target } = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
  if (target?.role === "admin") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return;
  }
  // 계정 삭제 → 프로필·알림은 함께 삭제되고, 작성한 댓글은 "탈퇴한 멤버"로 남습니다.
  await admin.auth.admin.deleteUser(id);
  revalidatePath("/admin");
}

// 이메일로 초대 (Supabase 이메일 설정 필요 — 설정 가이드 참고)
export async function inviteByEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionAdmin();
  if ("error" in me) return me;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "member") as UserRole;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "이메일 형식이 올바르지 않습니다." };
  if (name.length > 40) return { error: "이름은 40자 이내로 입력해 주세요." };
  if (!ROLES.includes(role)) return { error: "잘못된 권한입니다." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name: name || email.split("@")[0] },
    redirectTo: `${siteUrl()}/auth/confirm`,
  });
  if (error || !data.user) {
    const msg = error?.message.toLowerCase() ?? "";
    if (msg.includes("already")) return { error: "이미 가입되었거나 초대된 이메일입니다." };
    if (msg.includes("rate")) return { error: "짧은 시간에 너무 많은 메일을 보냈습니다. 잠시 후 다시 시도하거나 초대 코드를 이용하세요." };
    console.error("invite", error);
    return { error: "초대 메일을 보내지 못했습니다. Supabase 이메일(SMTP) 설정을 확인하거나, 초대 코드를 이용하세요." };
  }
  if (role === "admin") await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
  revalidatePath("/admin");
  return { success: `${email} 로 초대 메일을 보냈습니다.` };
}

// 초대 코드 만들기 (헷갈리는 글자 0/O, 1/I/L 제외)
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeCode() {
  return Array.from({ length: 8 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
}

export async function createInviteCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionAdmin();
  if ("error" in me) return me;
  const role = String(formData.get("role") ?? "member") as UserRole;
  const maxUses = Number(formData.get("max_uses") ?? 1);
  const days = Number(formData.get("days") ?? 7);
  const note = String(formData.get("note") ?? "").trim().slice(0, 100);
  if (!ROLES.includes(role)) return { error: "잘못된 권한입니다." };
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 200) return { error: "사용 가능 인원은 1~200 사이로 입력해 주세요." };
  if (!Number.isInteger(days) || days < 0 || days > 365) return { error: "유효 기간은 0~365일로 입력해 주세요." };

  const supabase = await createClient();
  const expires = days > 0 ? new Date(Date.now() + days * 86400_000).toISOString() : null;
  const code = makeCode();
  const { error } = await supabase
    .from("invite_codes")
    .insert({ code, role, max_uses: maxUses, expires_at: expires, note, created_by: me.id });
  if (error) return { error: "초대 코드를 만들지 못했습니다." };
  revalidatePath("/admin");
  return { success: `초대 코드 ${code} 를 만들었습니다.` };
}

export async function deleteInviteCode(formData: FormData) {
  const me = await actionAdmin();
  if ("error" in me) return;
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return;
  const supabase = await createClient();
  await supabase.from("invite_codes").delete().eq("id", id);
  revalidatePath("/admin");
}

// ------------------------------------------------------------------
// 카테고리 · 태그
// ------------------------------------------------------------------

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionAdmin();
  if ("error" in me) return me;
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const order = Number(formData.get("sort_order") ?? 0);
  if (!name || name.length > 40) return { error: "카테고리 이름을 입력해 주세요. (40자 이내)" };
  if (!Number.isInteger(order)) return { error: "순서는 숫자로 입력해 주세요." };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categories").update({ name, sort_order: order }).eq("id", id)
    : await supabase.from("categories").insert({ name, sort_order: order });
  if (error) {
    if (error.code === "23505") return { error: "같은 이름의 카테고리가 이미 있습니다." };
    return { error: "저장하지 못했습니다." };
  }
  revalidatePath("/admin/taxonomy");
  revalidatePath("/research");
  return { success: id ? "수정했습니다." : "추가했습니다." };
}

export async function deleteCategory(formData: FormData) {
  const me = await actionAdmin();
  if ("error" in me) return;
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return;
  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", id); // 연결된 자료는 "미분류"가 됨
  revalidatePath("/admin/taxonomy");
  revalidatePath("/research");
}

export async function renameTag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionAdmin();
  if ("error" in me) return me;
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().replace(/^#/, "");
  if (!UUID_RE.test(id)) return { error: "잘못된 요청입니다." };
  if (!name || name.length > 30) return { error: "태그 이름을 입력해 주세요. (30자 이내)" };
  const supabase = await createClient();
  const { error } = await supabase.from("tags").update({ name }).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "같은 이름의 태그가 이미 있습니다." };
    return { error: "저장하지 못했습니다." };
  }
  revalidatePath("/admin/taxonomy");
  return { success: "수정했습니다." };
}

export async function createTag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionAdmin();
  if ("error" in me) return me;
  const name = String(formData.get("name") ?? "").trim().replace(/^#/, "");
  if (!name || name.length > 30) return { error: "태그 이름을 입력해 주세요. (30자 이내)" };
  const supabase = await createClient();
  const { error } = await supabase.from("tags").insert({ name });
  if (error) {
    if (error.code === "23505") return { error: "같은 이름의 태그가 이미 있습니다." };
    return { error: "저장하지 못했습니다." };
  }
  revalidatePath("/admin/taxonomy");
  return { success: "추가했습니다." };
}

export async function deleteTag(formData: FormData) {
  const me = await actionAdmin();
  if ("error" in me) return;
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return;
  const supabase = await createClient();
  await supabase.from("tags").delete().eq("id", id);
  revalidatePath("/admin/taxonomy");
}

// ------------------------------------------------------------------
// 교수 소개 (홈 화면)
// ------------------------------------------------------------------

export async function saveSiteSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionAdmin();
  if ("error" in me) return me;
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const bio = String(formData.get("bio") ?? "").slice(0, 5000);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const office = String(formData.get("office") ?? "").trim().slice(0, 200);
  const areas = String(formData.get("research_areas") ?? "")
    .split(/[,\n]/)
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 12);
  const photoPath = String(formData.get("photo_path") ?? "");
  if (photoPath && !/^site\/[A-Za-z0-9_.-]+$/.test(photoPath)) return { error: "사진 경로가 올바르지 않습니다." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "이메일 형식이 올바르지 않습니다." };

  const supabase = await createClient();
  const { data: prev } = await supabase.from("site_settings").select("photo_path").eq("id", 1).maybeSingle();
  const { error } = await supabase
    .from("site_settings")
    .update({ name, title, bio, email, office, research_areas: areas, photo_path: photoPath || null })
    .eq("id", 1);
  if (error) return { error: "저장하지 못했습니다." };
  // 사진을 바꿨다면 이전 사진 파일 삭제
  if (prev?.photo_path && prev.photo_path !== photoPath) {
    await supabase.storage.from(BUCKET).remove([prev.photo_path]);
  }
  revalidatePath("/");
  revalidatePath("/admin/profile");
  return { success: "저장했습니다. 홈 화면에 반영되었습니다." };
}
