"use server";

// 수업 자료 저장/삭제 서버 액션 (교수 전용)
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removeFolder, syncAttachments } from "@/lib/attachments";
import { actionAdmin } from "@/lib/auth";
import { BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, CourseAudience } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveCourseMaterial(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionAdmin();
  if ("error" in me) return me;

  const id = String(formData.get("id") ?? "");
  const isNew = formData.get("mode") === "new";
  const semester = String(formData.get("semester") ?? "").trim();
  const courseName = String(formData.get("course_name") ?? "").trim();
  const weekRaw = String(formData.get("week") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const audience = String(formData.get("audience") ?? "members") as CourseAudience;

  // ---- 입력값 검증 ----
  if (!UUID_RE.test(id)) return { error: "잘못된 요청입니다. 페이지를 새로고침해 주세요." };
  if (!semester || semester.length > 20) return { error: "학기를 입력해 주세요. (예: 2026-1)" };
  if (!courseName || courseName.length > 100) return { error: "과목명을 입력해 주세요." };
  if (!title || title.length > 200) return { error: "제목을 입력해 주세요. (200자 이내)" };
  if (description.length > 20000) return { error: "설명이 너무 깁니다." };
  const week = weekRaw === "" ? 0 : Number(weekRaw);
  if (!Number.isInteger(week) || week < 0 || week > 30) return { error: "주차는 0~30 사이 숫자로 입력해 주세요." };
  if (audience !== "members" && audience !== "admin_only") return { error: "공개 대상이 올바르지 않습니다." };

  const supabase = await createClient();
  const row = { semester, course_name: courseName, week, title, description, audience };
  const { error } = isNew
    ? await supabase.from("course_materials").insert({ id, ...row, created_by: me.id })
    : await supabase.from("course_materials").update(row).eq("id", id);
  if (error) {
    console.error("course save", error);
    return { error: "수업 자료를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const sync = await syncAttachments(
    supabase,
    { column: "course_material_id", folder: "courses", id },
    String(formData.get("attachments") ?? "[]"),
  );
  if (sync.error) return { error: sync.error };

  revalidatePath("/courses");
  redirect(`/courses/${id}`);
}

export async function deleteCourseMaterial(formData: FormData) {
  const me = await actionAdmin();
  if ("error" in me) throw new Error(me.error);
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) throw new Error("잘못된 요청입니다.");

  const supabase = await createClient();
  const { data: c } = await supabase
    .from("course_materials")
    .select("semester, course_name")
    .eq("id", id)
    .maybeSingle();
  const { data: related } = await supabase.from("comments").select("id").eq("course_material_id", id);
  const commentIds = (related ?? []).map((r) => r.id as string);
  const { data: commentImages } = commentIds.length
    ? await supabase.from("attachments").select("storage_path").in("comment_id", commentIds)
    : { data: [] as { storage_path: string | null }[] };

  const { error } = await supabase.from("course_materials").delete().eq("id", id);
  if (error) throw new Error("삭제하지 못했습니다.");
  await removeFolder(supabase, `courses/${id}`);
  const paths = (commentImages ?? []).map((a) => a.storage_path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);

  revalidatePath("/courses");
  const params = c ? `?semester=${encodeURIComponent(c.semester)}&course=${encodeURIComponent(c.course_name)}` : "";
  redirect(`/courses${params}`);
}
