import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/comments/comment-section";
import { ConfirmButton } from "@/components/confirm-button";
import { Markdown } from "@/components/markdown";
import { btn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { LoungePost } from "@/lib/types";
import { deleteLoungePost, toggleLoungePin } from "../actions";

type Detail = LoungePost & { author: { display_name: string } | null };

async function load(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lounge_posts")
    .select("*, author:profiles!lounge_posts_author_id_fkey(display_name)")
    .eq("id", id)
    .maybeSingle();
  return data as Detail | null;
}

export async function generateMetadata({ params }: PageProps<"/lounge/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return {};
  return { title: (await load(id))?.title ?? "라운지" };
}

export default async function LoungePostPage({ params }: PageProps<"/lounge/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const post = await load(id);
  if (!post) notFound();
  const isMine = post.author_id === me.id;
  const isAdmin = me.role === "admin";

  return (
    <article className="max-w-3xl">
      <nav aria-label="위치" className="text-sm text-muted mb-8">
        <Link href="/lounge" className="hover:text-ink">
          연구실 라운지
        </Link>
      </nav>
      <header className="border-b border-ink pb-8 mb-10">
        {post.is_pinned && <p className="eyebrow !text-accent mb-3">고정된 글</p>}
        <h1 className="font-serif text-4xl md:text-5xl leading-tight">{post.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <span>{post.author?.display_name ?? "탈퇴한 멤버"}</span>
          <time dateTime={post.created_at}>{formatDateTime(post.created_at)}</time>
          <span className="flex gap-1 ml-auto">
            {isMine && (
              <Link href={`/lounge/${post.id}/edit`} className={btn.ghost}>
                수정
              </Link>
            )}
            {isAdmin && (
              <form action={toggleLoungePin}>
                <input type="hidden" name="id" value={post.id} />
                <input type="hidden" name="pinned" value={String(post.is_pinned)} />
                <button className={btn.ghost}>{post.is_pinned ? "고정 해제" : "상단 고정"}</button>
              </form>
            )}
            {(isMine || isAdmin) && (
              <form action={deleteLoungePost}>
                <input type="hidden" name="id" value={post.id} />
                <ConfirmButton message="이 글과 모든 의견을 삭제할까요?">삭제</ConfirmButton>
              </form>
            )}
          </span>
        </div>
      </header>
      {post.body ? <Markdown>{post.body}</Markdown> : <p className="text-muted">본문이 없습니다.</p>}
      <CommentSection target={{ type: "lounge", id: post.id }} me={me} />
    </article>
  );
}
