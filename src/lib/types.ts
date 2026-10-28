// 데이터베이스 테이블과 대응하는 TypeScript 타입 정의
// (supabase/schema.sql 과 같은 구조를 유지해야 합니다)

export type UserRole = "admin" | "member";
export type ResearchStatus = "in_progress" | "completed" | "presented" | "published";
export type CourseAudience = "members" | "admin_only";
export type AttachmentKind = "image" | "pdf" | "document" | "link";
export type NotificationType = "comment" | "reply" | "mention";

export type Profile = {
  id: string;
  display_name: string;
  role: UserRole;
  email_notify: boolean;
  created_at: string;
};

export type SiteSettings = {
  id: number;
  name: string;
  title: string;
  bio: string;
  research_areas: string[];
  email: string;
  office: string;
  photo_path: string | null;
  updated_at: string;
};

export type Category = { id: string; name: string; sort_order: number };
export type Tag = { id: string; name: string };

export type Attachment = {
  id: string;
  research_id: string | null;
  course_material_id: string | null;
  comment_id: string | null;
  kind: AttachmentKind;
  storage_path: string | null;
  thumb_path: string | null;
  url: string | null;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  sort_order: number;
};

export type Research = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category_id: string | null;
  year: number | null;
  status: ResearchStatus;
  cover_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseMaterial = {
  id: string;
  semester: string;
  course_name: string;
  week: number | null;
  title: string;
  description: string;
  audience: CourseAudience;
  created_at: string;
  updated_at: string;
};

export type LoungePost = {
  id: string;
  title: string;
  body: string;
  author_id: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  research_id: string | null;
  course_material_id: string | null;
  lounge_post_id: string | null;
  parent_id: string | null;
  author_id: string | null;
  body: string;
  is_pinned: boolean;
  edited: boolean;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  comment_id: string | null;
  link: string;
  excerpt: string;
  read_at: string | null;
  created_at: string;
};

export type InviteCode = {
  id: string;
  code: string;
  role: UserRole;
  max_uses: number;
  use_count: number;
  expires_at: string | null;
  note: string;
  created_at: string;
};

// 댓글이 달리는 대상 (연구 자료 / 수업 자료 / 라운지 글)
export type CommentTarget =
  | { type: "research"; id: string }
  | { type: "course"; id: string }
  | { type: "lounge"; id: string };

// 서버 액션 결과 (폼에 오류/성공 메시지를 보여 주기 위함)
export type ActionState = { error?: string; success?: string } | undefined;

// 폼에서 서버로 넘기는 첨부 정보 (attachments 행과 같은 모양)
export type AttachmentDraft = {
  id?: string; // 이미 저장된 첨부라면 DB id
  kind: AttachmentKind;
  storage_path: string | null;
  thumb_path: string | null;
  url: string | null;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
};
