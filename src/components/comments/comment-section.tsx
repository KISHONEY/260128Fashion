// 자료 상세 페이지 하단의 토론(댓글) 영역 — 서버에서 댓글을 불러와 그립니다.
import type { CurrentUser } from "@/lib/auth";
import { TARGET_COLUMN, targetPath } from "@/lib/comments";
import { createClient } from "@/lib/supabase/server";
import type { CommentTarget } from "@/lib/types";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";
import type { CommentView, Member } from "./types";

type Row = Omit<CommentView, "images" | "mentions"> & {
  attachments: CommentView["images"];
  mentions: { user_id: string; profile: { display_name: string } | null }[];
};

export async function CommentSection({ target, me }: { target: CommentTarget; me: CurrentUser }) {
  const supabase = await createClient();
  const [{ data }, { data: members }] = await Promise.all([
    supabase
      .from("comments")
      .select(
        "id, parent_id, body, is_pinned, edited, created_at, " +
          "author:profiles!comments_author_id_fkey(id, display_name, role), " +
          "attachments(id, storage_path, file_name, width, height), " +
          "mentions(user_id, profile:profiles!mentions_user_id_fkey(display_name))",
      )
      .eq(TARGET_COLUMN[target.type], target.id)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, display_name").order("display_name"),
  ]);

  const comments: CommentView[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    images: r.attachments ?? [],
    mentions: (r.mentions ?? [])
      .filter((m) => m.profile)
      .map((m) => ({ id: m.user_id, name: m.profile!.display_name })),
  }));

  // 원 댓글: 고정된 것 먼저, 그다음 오래된 순 / 답글: 오래된 순
  const top = comments
    .filter((c) => !c.parent_id)
    .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || a.created_at.localeCompare(b.created_at));
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);
  const path = targetPath(target);

  return (
    <section aria-labelledby="discussion-title" className="mt-20 md:mt-28">
      <div className="flex items-baseline justify-between border-b border-ink pb-3">
        <h2 id="discussion-title" className="font-serif text-3xl md:text-4xl">
          토론
        </h2>
        <span className="text-sm text-muted">{comments.length}개의 의견</span>
      </div>

      {top.length === 0 ? (
        <p className="py-10 text-muted text-sm">아직 의견이 없습니다. 첫 의견을 남겨 주세요.</p>
      ) : (
        <ul>
          {top.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              replies={repliesOf(c.id)}
              target={target}
              path={path}
              me={{ id: me.id, role: me.role }}
              members={(members ?? []) as Member[]}
            />
          ))}
        </ul>
      )}

      <div className="mt-8">
        <CommentForm target={target} members={(members ?? []) as Member[]} meId={me.id} />
      </div>
    </section>
  );
}
