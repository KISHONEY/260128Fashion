"use server";

// 연구실 라운지(자유 토론) 글 작성/수정/삭제/고정
// 작성자 확인, 고정 권한 등은 DB 트리거와 RLS 가 강제합니다.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionAdmin, actionUser } from "@/lib/auth";
import { BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveLoungePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionUser();
  if ("error" in me) return me;

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  if (!title || title.length > 200) return { error: "제목을 입력해 주세요. (200자 이내)" };
  if (body.length > 20000) return { error: "본문이 너무 깁니다." };

  const supabase = await createClient();
  if (id) {
    if (!UUID_RE.test(id)) return { error: "잘못된 요청입니다." };
    const { data, error } = await supabase
      .from("lounge_posts")
      .update({ title, body })
      .eq("id", id)
      .eq("author_id", me.id)
      .select("id");
    if (error || !data?.length) return { error: "본인이 쓴 글만 수정할 수 있습니다." };
    revalidatePath("/lounge");
    redirect(`/lounge/${id}`);
  }

  const { data, error } = await supabase
    .from("lounge_posts")
    .insert({ title, body, author_id: me.id })
    .select("id")
    .single();
  if (error || !data) {
    console.error("lounge insert", error);
    return { error: "글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/lounge");
  revalidatePath("/");
  redirect(`/lounge/${data.id}`);
}

export async function deleteLoungePost(formData: FormData) {
  const me = await actionUser();
  if ("error" in me) throw new Error(me.error);
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) throw new Error("잘못된 요청입니다.");

  const supabase = await createClient();
  const { data: related } = await supabase.from("comments").select("id").eq("lounge_post_id", id);
  const ids = (related ?? []).map((r) => r.id as string);
  const { data: imgs } = ids.length
    ? await supabase.from("attachments").select("storage_path").in("comment_id", ids)
    : { data: [] as { storage_path: string | null }[] };
  const { data: deleted } = await supabase.from("lounge_posts").delete().eq("id", id).select("id");
  if (!deleted?.length) throw new Error("삭제 권한이 없습니다.");
  const paths = (imgs ?? []).map((a) => a.storage_path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  revalidatePath("/lounge");
  redirect("/lounge");
}

export async function toggleLoungePin(formData: FormData) {
  const me = await actionAdmin();
  if ("error" in me) return;
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return;
  const supabase = await createClient();
  await supabase.from("lounge_posts").update({ is_pinned: formData.get("pinned") !== "true" }).eq("id", id);
  revalidatePath("/lounge");
  revalidatePath(`/lounge/${id}`);
}
