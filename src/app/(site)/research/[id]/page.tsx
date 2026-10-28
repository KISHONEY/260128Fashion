// 연구 자료 상세: 제목·요약 → 이미지 갤러리 → 본문 → 첨부 파일 → 토론
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentList } from "@/components/attachment-list";
import { CommentSection } from "@/components/comments/comment-section";
import { ConfirmButton } from "@/components/confirm-button";
import { ImageGallery, type GalleryImage } from "@/components/image-gallery";
import { Markdown } from "@/components/markdown";
import { btn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Attachment, Research } from "@/lib/types";
import { deleteResearch } from "../actions";

type Detail = Research & {
  category: { id: string; name: string } | null;
  tags: { tag: { id: string; name: string } | null }[];
  attachments: Attachment[];
};

async function load(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("research")
    .select("*, category:categories(id, name), tags:research_tags(tag:tags(id, name)), attachments(*)")
    .eq("id", id)
    .maybeSingle();
  return data as Detail | null;
}

export async function generateMetadata({ params }: PageProps<"/research/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return {};
  const r = await load(id);
  return { title: r?.title ?? "연구 자료" };
}

export default async function ResearchDetailPage({ params }: PageProps<"/research/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const research = await load(id);
  if (!research) notFound();

  const attachments = [...research.attachments].sort((a, b) => a.sort_order - b.sort_order);
  const images: GalleryImage[] = attachments
    .filter((a) => a.kind === "image" && a.storage_path)
    .map((a) => ({
      id: a.id,
      src: a.storage_path!,
      thumb: a.thumb_path,
      alt: a.file_name || research.title,
      width: a.width,
      height: a.height,
    }));
  const files = attachments.filter((a) => a.kind !== "image");
  const tags = research.tags.map((t) => t.tag).filter(Boolean) as { id: string; name: string }[];

  return (
    <article>
      <nav aria-label="위치" className="text-sm text-muted mb-8">
        <Link href="/research" className="hover:text-ink">
          연구
        </Link>
        {research.category && (
          <>
            {" / "}
            <Link href={`/research?category=${research.category.id}`} className="hover:text-ink">
              {research.category.name}
            </Link>
          </>
        )}
      </nav>

      <header className="grid gap-6 lg:grid-cols-[1fr_16rem] lg:gap-16 border-b border-ink pb-10 mb-10">
        <div>
          <p className="eyebrow mb-4">
            {research.year ?? "—"} · <span className="text-accent">{STATUS_LABEL[research.status]}</span>
          </p>
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.08] tracking-tight">{research.title}</h1>
          {research.summary && (
            <p className="mt-6 text-lg md:text-xl leading-relaxed text-ink/80 max-w-3xl">{research.summary}</p>
          )}
        </div>
        <dl className="text-sm grid grid-cols-2 lg:grid-cols-1 gap-4 lg:self-end">
          <div>
            <dt className="eyebrow">카테고리</dt>
            <dd className="mt-1">{research.category?.name ?? "미분류"}</dd>
          </div>
          <div>
            <dt className="eyebrow">등록일</dt>
            <dd className="mt-1">{formatDate(research.created_at)}</dd>
          </div>
          {tags.length > 0 && (
            <div className="col-span-2 lg:col-span-1">
              <dt className="eyebrow">태그</dt>
              <dd className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {tags.map((t) => (
                  <Link key={t.id} href={`/research?tag=${t.id}`} className="hover:text-accent">
                    #{t.name}
                  </Link>
                ))}
              </dd>
            </div>
          )}
          {me.role === "admin" && (
            <div className="col-span-2 lg:col-span-1 flex gap-2 pt-2">
              <Link href={`/research/${research.id}/edit`} className={btn.small}>
                수정
              </Link>
              <form action={deleteResearch}>
                <input type="hidden" name="id" value={research.id} />
                <ConfirmButton
                  variant="small"
                  message="이 연구 자료와 모든 첨부 파일, 댓글을 삭제할까요? 되돌릴 수 없습니다."
                >
                  삭제
                </ConfirmButton>
              </form>
            </div>
          )}
        </dl>
      </header>

      {images.length > 0 && (
        <section aria-label="이미지" className="mb-14">
          <ImageGallery images={images} />
        </section>
      )}

      <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
        <div className="min-w-0 max-w-3xl">
          {research.body ? (
            <Markdown>{research.body}</Markdown>
          ) : (
            <p className="text-muted">상세 설명이 없습니다.</p>
          )}
        </div>
        {files.length > 0 && (
          <aside aria-labelledby="files-title">
            <h2 id="files-title" className="eyebrow mb-3">
              첨부 파일
            </h2>
            <AttachmentList items={files} />
          </aside>
        )}
      </div>

      <CommentSection target={{ type: "research", id: research.id }} me={me} />
    </article>
  );
}
