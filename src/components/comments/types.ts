// 댓글 화면에서 쓰는 데이터 모양
export type Member = { id: string; display_name: string };

export type CommentView = {
  id: string;
  parent_id: string | null;
  body: string;
  is_pinned: boolean;
  edited: boolean;
  created_at: string;
  author: { id: string; display_name: string; role: "admin" | "member" } | null;
  images: { id: string; storage_path: string; file_name: string; width: number | null; height: number | null }[];
  mentions: { id: string; name: string }[];
};
