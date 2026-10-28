// 댓글 대상(연구/수업/라운지) ↔ DB 칼럼·주소 변환 도우미
import type { CommentTarget } from "./types";

export const TARGET_COLUMN = {
  research: "research_id",
  course: "course_material_id",
  lounge: "lounge_post_id",
} as const;

export function targetPath(target: CommentTarget) {
  if (target.type === "research") return `/research/${target.id}`;
  if (target.type === "course") return `/courses/${target.id}`;
  return `/lounge/${target.id}`;
}
