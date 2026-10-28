"use server";

// 댓글 작성/수정/삭제/고정 서버 액션
// 세부 규칙(작성자 본인 확인, 대댓글 1단계, 고정은 교수만 등)은
// DB 의 RLS 정책과 트리거가 강제합니다. 여기서는 입력값을 검증합니다.
import { revalidatePath } from "next/cache";
import { actionAdmin, actionUser } from "@/lib/auth";
import { TARGET_COLUMN, targetPath } from "@/lib/comments";
import { ALLOWED_MIME, BUCKET, MAX_COMMENT_IMAGES } from "@/lib/constants";
import { sendMentionEmails } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, AttachmentDraft, CommentTarget } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseTarget(formData: FormData): CommentTarget | null {
  const type = String(formData.get("target_type") ?? "");
  const id = String(formData.get("target_id") ?? "");
  if (!UUID_RE.test(id)) return null;
  if (type === "research" || type === "course" || type === "lounge") return { type, id };
  return null;
}

export async function createComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionUser();
  if ("error" in me) return me;

  const target = parseTarget(formData);
  if (!target) return { error: "잘못된 요청입니다." };
  const parentId = String(formData.get("parent_id") ?? "");
  if (parentId && !UUID_RE.test(parentId)) return { error: "잘못된 요청입니다." };
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "내용을 입력해 주세요." };
  if (body.length > 5000) return { error: "댓글은 5000자 이내로 입력해 주세요." };

  // 이미지 첨부 검증: 본인 폴더(comments/<내 ID>/) 안의 실제 업로드 파일만 허용
  let images: AttachmentDraft[] = [];
  try {
    images = JSON.parse(String(formData.get("images") ?? "[]"));
    if (!Array.isArray(images)) throw new Error();
  } catch {
    return { error: "첨부 이미지 정보를 읽지 못했습니다." };
  }
  if (images.length > MAX_COMMENT_IMAGES) return { error: `이미지는 최대 ${MAX_COMMENT_IMAGES}장까지 첨부할 수 있습니다.` };

  const supabase = await createClient();
  const folder = `comments/${me.id}`;
  const pathRe = new RegExp(`^${folder}/[A-Za-z0-9_.-]+$`);
  const verified: { storage_path: string; file_name: string; size: number; mime: string; width: number | null; height: number | null }[] = [];
  for (const img of images) {
    const path = String(img.storage_path ?? "");
    if (!pathRe.test(path)) return { error: "첨부 이미지 경로가 올바르지 않습니다." };
    const fileName = path.slice(folder.length + 1);
    const { data: found } = await supabase.storage.from(BUCKET).list(folder, { search: fileName, limit: 1 });
    const obj = found?.find((o) => o.name === fileName);
    const meta = (obj?.metadata ?? {}) as { size?: number; mimetype?: string };
    if (!obj || !meta.mimetype?.startsWith("image/") || !ALLOWED_MIME.has(meta.mimetype)) {
      return { error: "이미지 업로드가 완료되지 않았습니다. 다시 올려 주세요." };
    }
    verified.push({
      storage_path: path,
      file_name: String(img.file_name ?? "image").slice(0, 255),
      size: meta.size ?? 0,
      mime: meta.mimetype,
      width: Number.isFinite(img.width) ? Number(img.width) : null,
      height: Number.isFinite(img.height) ? Number(img.height) : null,
    });
  }

  // 1) 댓글 저장
  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      [TARGET_COLUMN[target.type]]: target.id,
      parent_id: parentId || null,
      author_id: me.id,
      body,
    })
    .select("id")
    .single();
  if (error || !comment) {
    console.error("comment insert", error);
    if (error?.message.includes("답글")) return { error: error.message };
    return { error: "댓글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  // 2) 이미지 첨부 저장
  if (verified.length) {
    await supabase.from("attachments").insert(
      verified.map((v, i) => ({
        comment_id: comment.id,
        kind: "image",
        storage_path: v.storage_path,
        file_name: v.file_name,
        mime_type: v.mime,
        size_bytes: v.size,
        width: v.width,
        height: v.height,
        sort_order: i,
      })),
    );
  }

  // 3) 멘션 저장 — 본문에 실제로 "@이름" 이 들어 있는 멤버만 (알림은 DB 트리거가 생성)
  let mentionIds: string[] = [];
  try {
    mentionIds = (JSON.parse(String(formData.get("mentions") ?? "[]")) as string[]).filter((id) =>
      UUID_RE.test(String(id)),
    );
  } catch {
    mentionIds = [];
  }
  if (mentionIds.length) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", [...new Set(mentionIds)].slice(0, 20));
    const valid = (people ?? []).filter((p) => p.id !== me.id && body.includes(`@${p.display_name}`));
    if (valid.length) {
      await supabase.from("mentions").insert(valid.map((p) => ({ comment_id: comment.id, user_id: p.id })));
      await sendMentionEmails({
        userIds: valid.map((p) => p.id),
        actorName: me.display_name,
        link: `${targetPath(target)}#comment-${comment.id}`,
        excerpt: body.slice(0, 200),
      });
    }
  }

  revalidatePath(targetPath(target));
  return { success: "댓글을 등록했습니다." };
}

export async function updateComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await actionUser();
  if ("error" in me) return me;
  const id = String(formData.get("id") ?? "");
  const path = String(formData.get("path") ?? "/");
  const body = String(formData.get("body") ?? "").trim();
  if (!UUID_RE.test(id)) return { error: "잘못된 요청입니다." };
  if (!body || body.length > 5000) return { error: "내용을 입력해 주세요. (5000자 이내)" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .update({ body })
    .eq("id", id)
    .eq("author_id", me.id)
    .select("id");
  if (error || !data?.length) return { error: "본인이 쓴 댓글만 수정할 수 있습니다." };
  if (path.startsWith("/")) revalidatePath(path);
  return { success: "수정했습니다." };
}

export async function deleteComment(formData: FormData) {
  const me = await actionUser();
  if ("error" in me) return;
  const id = String(formData.get("id") ?? "");
  const path = String(formData.get("path") ?? "/");
  if (!UUID_RE.test(id)) return;

  const supabase = await createClient();
  // 함께 지워질 답글까지 포함해 첨부 이미지 경로를 먼저 모아 둠
  const { data: related } = await supabase.from("comments").select("id").or(`id.eq.${id},parent_id.eq.${id}`);
  const ids = (related ?? []).map((c) => c.id as string);
  const { data: imgs } = ids.length
    ? await supabase.from("attachments").select("storage_path").in("comment_id", ids)
    : { data: [] as { storage_path: string | null }[] };
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (!error) {
    const paths = (imgs ?? []).map((a) => a.storage_path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  }
  if (path.startsWith("/")) revalidatePath(path);
}

export async function togglePin(formData: FormData) {
  const me = await actionAdmin();
  if ("error" in me) return;
  const id = String(formData.get("id") ?? "");
  const path = String(formData.get("path") ?? "/");
  const pinned = formData.get("pinned") === "true";
  if (!UUID_RE.test(id)) return;
  const supabase = await createClient();
  await supabase.from("comments").update({ is_pinned: !pinned }).eq("id", id);
  if (path.startsWith("/")) revalidatePath(path);
}
