// 화면에 표시하는 한국어 라벨과 업로드 규칙 (브라우저·서버 공통 사용)
import type { AttachmentKind, CourseAudience, ResearchStatus, UserRole } from "./types";

export const SITE_NAME = "연구 아카이브";

export const STATUS_LABEL: Record<ResearchStatus, string> = {
  in_progress: "진행중",
  completed: "완료",
  presented: "발표",
  published: "출판",
};
export const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as ResearchStatus[];

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "교수(관리자)",
  member: "대학원생",
};

export const AUDIENCE_LABEL: Record<CourseAudience, string> = {
  members: "전체 멤버 공개",
  admin_only: "비공개 (교수만)",
};

export const KIND_LABEL: Record<AttachmentKind, string> = {
  image: "이미지",
  pdf: "PDF",
  document: "문서",
  link: "링크",
};

// ----------------------------------------------------------------
// 업로드 규칙
// Supabase Storage 버킷에도 같은 제한(50MB, 허용 형식)이 걸려 있어
// 브라우저를 우회한 업로드도 서버에서 거부됩니다.
// ----------------------------------------------------------------
export const MB = 1024 * 1024;
export const MAX_FILE_BYTES = 50 * MB; // 문서/PDF 최대 크기
export const MAX_IMAGE_SOURCE_BYTES = 30 * MB; // 리사이즈 전 원본 이미지 최대 크기
export const MAX_FILES_PER_ITEM = 30; // 자료 1건당 첨부 개수
export const MAX_COMMENT_IMAGES = 4; // 댓글 1건당 이미지 개수

// 이미지 리사이즈 기준 (긴 변 픽셀)
export const IMAGE_MAX_SIDE = 2000;
export const THUMB_MAX_SIDE = 640;
export const COMMENT_IMAGE_MAX_SIDE = 1600;

// 확장자 → MIME 형식 / 분류
export const FILE_TYPES: Record<string, { mime: string; kind: AttachmentKind }> = {
  jpg: { mime: "image/jpeg", kind: "image" },
  jpeg: { mime: "image/jpeg", kind: "image" },
  png: { mime: "image/png", kind: "image" },
  webp: { mime: "image/webp", kind: "image" },
  gif: { mime: "image/gif", kind: "image" },
  pdf: { mime: "application/pdf", kind: "pdf" },
  ppt: { mime: "application/vnd.ms-powerpoint", kind: "document" },
  pptx: {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    kind: "document",
  },
  doc: { mime: "application/msword", kind: "document" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    kind: "document",
  },
  xls: { mime: "application/vnd.ms-excel", kind: "document" },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    kind: "document",
  },
  hwp: { mime: "application/x-hwp", kind: "document" },
  hwpx: { mime: "application/vnd.hancom.hwpx", kind: "document" },
  txt: { mime: "text/plain", kind: "document" },
};

export const ALLOWED_MIME = new Set(Object.values(FILE_TYPES).map((t) => t.mime));
export const ACCEPT_ATTR = Object.keys(FILE_TYPES)
  .map((ext) => "." + ext)
  .join(",");
export const ACCEPT_IMAGES = ".jpg,.jpeg,.png,.webp,.gif";

export function fileTypeOf(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return FILE_TYPES[ext] ?? null;
}
