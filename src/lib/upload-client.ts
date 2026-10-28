// 브라우저에서 Supabase Storage 로 파일을 올리는 도우미
// 업로드 권한은 Storage RLS 정책이 검사합니다 (교수: 자료 폴더, 멤버: 본인 댓글 폴더)
import {
  ALLOWED_MIME,
  BUCKET,
  COMMENT_IMAGE_MAX_SIDE,
  IMAGE_MAX_SIDE,
  MAX_FILE_BYTES,
  MAX_IMAGE_SOURCE_BYTES,
  THUMB_MAX_SIDE,
  fileTypeOf,
} from "./constants";
import { resizeImage } from "./image-resize";
import { createClient } from "./supabase/client";
import type { AttachmentDraft } from "./types";

function randomName(ext: string) {
  return `${crypto.randomUUID()}.${ext}`;
}

async function put(path: string, body: Blob, contentType: string) {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("size")) throw new Error("파일이 너무 큽니다. (최대 50MB)");
    if (msg.includes("mime") || msg.includes("type")) throw new Error("허용되지 않는 파일 형식입니다.");
    if (msg.includes("row-level") || msg.includes("unauthorized") || msg.includes("403"))
      throw new Error("업로드 권한이 없습니다.");
    throw new Error("업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

// 파일 하나를 검사 → (이미지면 리사이즈 + 썸네일) → 업로드
// folder 예: "research/<연구ID>", "comments/<사용자ID>"
export async function uploadAttachment(
  file: File,
  folder: string,
  opts: { imagesOnly?: boolean; noThumb?: boolean } = {},
): Promise<AttachmentDraft> {
  const type = fileTypeOf(file.name);
  if (!type || !ALLOWED_MIME.has(type.mime)) {
    throw new Error(`"${file.name}" 은(는) 올릴 수 없는 형식입니다.`);
  }
  if (opts.imagesOnly && type.kind !== "image") {
    throw new Error("이미지 파일만 올릴 수 있습니다.");
  }

  if (type.kind === "image") {
    if (file.size > MAX_IMAGE_SOURCE_BYTES) throw new Error(`"${file.name}" 이미지가 너무 큽니다. (최대 30MB)`);
    const maxSide = opts.noThumb ? COMMENT_IMAGE_MAX_SIDE : IMAGE_MAX_SIDE;
    const main = await resizeImage(file, maxSide);
    const mainPath = `${folder}/${randomName("jpg")}`;
    await put(mainPath, main.blob, "image/jpeg");

    let thumbPath: string | null = null;
    if (!opts.noThumb) {
      const thumb = await resizeImage(main.blob, THUMB_MAX_SIDE, 0.8);
      thumbPath = `${folder}/thumb_${randomName("jpg")}`;
      await put(thumbPath, thumb.blob, "image/jpeg");
    }
    return {
      kind: "image",
      storage_path: mainPath,
      thumb_path: thumbPath,
      url: null,
      file_name: file.name.slice(0, 255),
      mime_type: "image/jpeg",
      size_bytes: main.blob.size,
      width: main.width,
      height: main.height,
    };
  }

  if (file.size > MAX_FILE_BYTES) throw new Error(`"${file.name}" 파일이 너무 큽니다. (최대 50MB)`);
  const ext = file.name.split(".").pop()!.toLowerCase();
  const path = `${folder}/${randomName(ext)}`;
  await put(path, file, type.mime);
  return {
    kind: type.kind,
    storage_path: path,
    thumb_path: null,
    url: null,
    file_name: file.name.slice(0, 255),
    mime_type: type.mime,
    size_bytes: file.size,
    width: null,
    height: null,
  };
}
