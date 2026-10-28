// 연구실 라운지: 자료와 무관한 자유 토론 게시판
import Link from "next/link";
import { EmptyState, PageHeader, btn } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "연구실 라운지" };

type Row = {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  author: { display_name: string } | null;
  comments: { count: number }[];
};

export default async function LoungePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lounge_posts")
    .select("id, title, body, is_pinned, created_at, author:profiles!lounge_posts_author_id_fkey(display_name), comments(count)")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  const posts = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader
        eyebrow="Lab Lounge"
        title="연구실 라운지"
        description="연구 아이디어, 참고 자료, 전시 소식, 질문 — 무엇이든 자유롭게 나누는 공간입니다."
        actions={
          <Link href="/lounge/new" className={btn.primary}>
            + 글쓰기
          </Link>
        }
      />
      {posts.length === 0 ? (
        <EmptyState title="아직 글이 없습니다">
          <p>첫 이야기를 시작해 보세요.</p>
        </EmptyState>
      ) : (
        <ul className="border-t border-ink">
          {posts.map((p) => (
            <li key={p.id} className="border-b border-line">
              <Link href={`/lounge/${p.id}`} className="group grid md:grid-cols-[1fr_10rem_6rem] gap-2 md:gap-6 py-6 items-baseline">
                <div className="min-w-0">
                  <h2 className="font-serif text-xl md:text-2xl group-hover:text-accent transition-colors">
                    {p.is_pinned && <span className="text-xs font-sans tracking-wider text-accent mr-2 align-middle">고정</span>}
                    {p.title}
                  </h2>
                  {p.body && (
                    <p className="mt-1 text-sm text-muted line-clamp-1">{p.body.replace(/[#*_>`[\]()-]/g, "")}</p>
                  )}
                </div>
                <span className="text-sm text-muted">
                  {p.author?.display_name ?? "탈퇴한 멤버"} · {timeAgo(p.created_at)}
                </span>
                <span className="text-sm text-muted md:text-right">의견 {p.comments?.[0]?.count ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
