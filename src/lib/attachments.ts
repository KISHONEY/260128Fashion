// 첨부 파일 서버 측 검증 + DB 동기화 (서버 전용)
//
// 브라우저가 보낸 첨부 목록을 그대로 믿지 않고,
//  1) 경로가 해당 자료의 폴더 안에 있는지
//  2) 실제로 Storage 에 파일이 존재하는지
//  3) Storage 가 기록한 실제 크기/형식이 허용 범위인지
// 를 서버에서 다시 확인한 뒤 attachments 테이블에 반영합니다.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ALLOWED_MIME, BUCKET, MAX_FILE_BYTES, MAX_FILES_PER_ITEM } from "./constants";
import type { Attachment, AttachmentDraft, AttachmentKind } from "./types";

type Owner =
  | { column: "research_id"; folder: "research"; id: string }
  | { column: "course_material_id"; folder: "courses"; id: string };

type StorageMeta = { size: number; mimetype: string };

function kindFromMime(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  return "document";
}

export async function listFolder(supabase: SupabaseClient, folder: string) {
  const files = new Map<string, StorageMeta>();
  const { data } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 });
  for (const obj of data ?? []) {
    if (!obj.id) continue; // 하위 폴더는 건너뜀
    const meta = (obj.metadata ?? {}) as Partial<StorageMeta>;
    files.set(`${folder}/${obj.name}`, { size: meta.size ?? 0, mimetype: meta.mimetype ?? "" });
  }
  return files;
}

export async function syncAttachments(
  supabase: SupabaseClient,
  owner: Owner,
  rawJson: string,
): Promise<{ error?: string; coverPath?: string | null }> {
  let drafts: AttachmentDraft[];
  try {
    drafts = JSON.parse(rawJson || "[]");
    if (!Array.isArray(drafts)) throw new Error();
  } catch {
    return { error: "첨부 파일 정보를 읽지 못했습니다." };
  }
  if (drafts.length > MAX_FILES_PER_ITEM) {
    return { error: `첨부는 최대 ${MAX_FILES_PER_ITEM}개까지 가능합니다.` };
  }

  const folder = `${owner.folder}/${owner.id}`;
  const pathRe = new RegExp(`^${owner.folder}/${owner.id}/[A-Za-z0-9_.-]+$`);
  const stored = await listFolder(supabase, folder);

  // 1) 각 항목 검증 → DB 에 넣을 행으로 변환
  const rows: Array<Omit<Attachment, "id" | "research_id" | "course_material_id" | "comment_id"> & { id?: string }> = [];
  for (const [index, d] of drafts.entries()) {
    const fileName = String(d.file_name ?? "").slice(0, 255);
    if (d.kind === "link") {
      const url = String(d.url ?? "").trim();
      if (!/^https?:\/\/\S+$/i.test(url) || url.length > 2000) {
        return { error: `링크 주소가 올바르지 않습니다: ${url || "(비어 있음)"}` };
      }
      rows.push({
        id: d.id, kind: "link", storage_path: null, thumb_path: null, url,
        file_name: fileName || url, mime_type: null, size_bytes: null,
        width: null, height: null, sort_order: index,
      });
      continue;
    }

    const path = String(d.storage_path ?? "");
    const meta = stored.get(path);
    if (!pathRe.test(path) || !meta) {
      return { error: `업로드가 완료되지 않은 파일이 있습니다: ${fileName}. 다시 올려 주세요.` };
    }
    if (!ALLOWED_MIME.has(meta.mimetype)) return { error: `허용되지 않는 형식입니다: ${fileName}` };
    if (meta.size > MAX_FILE_BYTES) return { error: `파일이 너무 큽니다: ${fileName}` };

    const kind = kindFromMime(meta.mimetype);
    let thumb: string | null = null;
    if (kind === "image" && d.thumb_path) {
      thumb = String(d.thumb_path);
      if (!pathRe.test(thumb) || !stored.has(thumb)) thumb = null;
    }
    rows.push({
      id: d.id, kind, storage_path: path, thumb_path: thumb, url: null,
      file_name: fileName || "파일", mime_type: meta.mimetype, size_bytes: meta.size,
      width: kind === "image" && Number.isFinite(d.width) ? Number(d.width) : null,
      height: kind === "image" && Number.isFinite(d.height) ? Number(d.height) : null,
      sort_order: index,
    });
  }

  // 2) 기존 첨부와 비교해 삭제/수정/추가
  const { data: existing, error: loadError } = await supabase
    .from("attachments")
    .select("id")
    .eq(owner.column, owner.id);
  if (loadError) return { error: "첨부 정보를 불러오지 못했습니다." };

  const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id!));
  const removeIds = (existing ?? []).map((e) => e.id as string).filter((id) => !keepIds.has(id));
  if (removeIds.length) {
    const { error } = await supabase.from("attachments").delete().in("id", removeIds);
    if (error) return { error: "첨부 파일을 삭제하지 못했습니다." };
  }

  const existingIds = new Set((existing ?? []).map((e) => e.id as string));
  for (const row of rows) {
    if (row.id && existingIds.has(row.id)) {
      const { error } = await supabase
        .from("attachments")
        .update({ sort_order: row.sort_order, file_name: row.file_name, url: row.url })
        .eq("id", row.id)
        .eq(owner.column, owner.id);
      if (error) return { error: "첨부 순서를 저장하지 못했습니다." };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _ignored, ...insertRow } = row;
      const { error } = await supabase
        .from("attachments")
        .insert({ ...insertRow, [owner.column]: owner.id });
      if (error) return { error: "첨부 파일을 저장하지 못했습니다." };
    }
  }

  // 3) 폴더 안에서 더 이상 쓰이지 않는 파일 정리 (삭제한 첨부, 저장하지 않은 업로드)
  const used = new Set<string>();
  rows.forEach((r) => {
    if (r.storage_path) used.add(r.storage_path);
    if (r.thumb_path) used.add(r.thumb_path);
  });
  const orphans = [...stored.keys()].filter((p) => !used.has(p));
  if (orphans.length) await supabase.storage.from(BUCKET).remove(orphans);

  const firstImage = rows.find((r) => r.kind === "image");
  return { coverPath: firstImage ? (firstImage.thumb_path ?? firstImage.storage_path) : null };
}

// 자료를 삭제할 때 폴더 안 파일 전부 삭제
export async function removeFolder(supabase: SupabaseClient, folder: string) {
  const files = await listFolder(supabase, folder);
  if (files.size) await supabase.storage.from(BUCKET).remove([...files.keys()]);
}
