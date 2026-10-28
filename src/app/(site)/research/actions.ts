"use server";

// 연구 자료 저장/삭제 서버 액션 (교수 전용)
// 권한은 Supabase RLS 가 최종 확인하며, 여기서는 입력값을 검증합니다.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removeFolder, syncAttachments } from "@/lib/attachments";
import { actionAdmin } from "@/lib/auth";
import { BUCKET, STATUS_OPTIONS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, ResearchStatus } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveResearch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionAdmin();
  if ("error" in me) return me;

  const id = String(formData.get("id") ?? "");
  const isNew = formData.get("mode") === "new";
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const yearRaw = String(formData.get("year") ?? "").trim();
  const status = String(formData.get("status") ?? "in_progress") as ResearchStatus;

  // ---- 입력값 검증 ----
  if (!UUID_RE.test(id)) return { error: "잘못된 요청입니다. 페이지를 새로고침해 주세요." };
  if (!title || title.length > 200) return { error: "제목을 입력해 주세요. (200자 이내)" };
  if (summary.length > 500) return { error: "요약은 500자 이내로 입력해 주세요." };
  if (body.length > 50000) return { error: "상세 설명이 너무 깁니다." };
  if (!STATUS_OPTIONS.includes(status)) return { error: "상태 값이 올바르지 않습니다." };
  const year = yearRaw ? Number(yearRaw) : null;
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2200)) {
    return { error: "연도를 올바르게 입력해 주세요. (예: 2026)" };
  }
  if (categoryId && !UUID_RE.test(categoryId)) return { error: "카테고리 값이 올바르지 않습니다." };

  let tagNames: string[] = [];
  try {
    tagNames = JSON.parse(String(formData.get("tags") ?? "[]"));
  } catch {
    return { error: "태그 값을 읽지 못했습니다." };
  }
  tagNames = [...new Set(tagNames.map((t) => String(t).trim()).filter(Boolean))].slice(0, 20);
  if (tagNames.some((t) => t.length > 30)) return { error: "태그는 30자 이내로 입력해 주세요." };

  const supabase = await createClient();

  // ---- 1) 본문 저장 ----
  const row = {
    title,
    summary,
    body,
    category_id: categoryId || null,
    year,
    status,
  };
  if (isNew) {
    const { error } = await supabase.from("research").insert({ id, ...row, created_by: me.id });
    if (error) {
      console.error("research insert", error);
      return { error: "연구 자료를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }
  } else {
    const { error } = await supabase.from("research").update(row).eq("id", id);
    if (error) {
      console.error("research update", error);
      return { error: "연구 자료를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }
  }

  // ---- 2) 태그 저장 (없는 태그는 새로 만듦) ----
  if (tagNames.length) {
    await supabase.from("tags").upsert(
      tagNames.map((name) => ({ name })),
      { onConflict: "name", ignoreDuplicates: true },
    );
  }
  const { data: tagRows } = tagNames.length
    ? await supabase.from("tags").select("id, name").in("name", tagNames)
    : { data: [] as { id: string; name: string }[] };
  await supabase.from("research_tags").delete().eq("research_id", id);
  if (tagRows?.length) {
    const { error } = await supabase
      .from("research_tags")
      .insert(tagRows.map((t) => ({ research_id: id, tag_id: t.id })));
    if (error) return { error: "태그를 저장하지 못했습니다." };
  }

  // ---- 3) 첨부 파일 검증 + 저장 ----
  const sync = await syncAttachments(
    supabase,
    { column: "research_id", folder: "research", id },
    String(formData.get("attachments") ?? "[]"),
  );
  if (sync.error) return { error: sync.error };
  await supabase.from("research").update({ cover_path: sync.coverPath ?? null }).eq("id", id);

  revalidatePath("/research");
  revalidatePath("/");
  redirect(`/research/${id}`);
}

export async function deleteResearch(formData: FormData) {
  const me = await actionAdmin();
  if ("error" in me) throw new Error(me.error);
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) throw new Error("잘못된 요청입니다.");

  const supabase = await createClient();
  // 댓글에 첨부된 이미지 경로도 함께 정리
  const { data: commentImages } = await supabase
    .from("attachments")
    .select("storage_path, comment:comments!inner(research_id)")
    .eq("comment.research_id", id);
  const { error } = await supabase.from("research").delete().eq("id", id);
  if (error) throw new Error("삭제하지 못했습니다.");
  await removeFolder(supabase, `research/${id}`);
  const paths = (commentImages ?? []).map((a) => a.storage_path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);

  revalidatePath("/research");
  revalidatePath("/");
  redirect("/research");
}
