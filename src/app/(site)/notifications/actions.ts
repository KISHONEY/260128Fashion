"use server";

// 알림 읽음 처리 (본인 알림만 — RLS 로 보장)
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// 알림을 누르면 읽음 처리 후 해당 댓글로 이동
export async function openNotification(formData: FormData) {
  const me = await actionUser();
  if ("error" in me) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", me.id)
    .select("link")
    .maybeSingle();
  revalidatePath("/", "layout");
  const link = data?.link ?? "/notifications";
  redirect(link.startsWith("/") ? link : "/notifications");
}

export async function markAllRead() {
  const me = await actionUser();
  if ("error" in me) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", me.id)
    .is("read_at", null);
  revalidatePath("/", "layout");
}
