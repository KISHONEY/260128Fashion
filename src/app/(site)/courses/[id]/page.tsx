// 수업 자료 상세: 과목·주차 정보, 설명, 첨부(이미지/파일/링크), 토론
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentList } from "@/components/attachment-list";
import { CommentSection } from "@/components/comments/comment-section";
import { ConfirmButton } from "@/components/confirm-button";
import { ImageGallery, type GalleryImage } from "@/components/image-gallery";
import { Markdown } from "@/components/markdown";
import { Badge, btn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { AUDIENCE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Attachment, CourseMaterial } from "@/lib/types";
import { deleteCourseMaterial } from "../actions";

async function load(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("course_materials").select("*, attachments(*)").eq("id", id).maybeSingle();
  return data as (CourseMaterial & { attachments: Attachment[] }) | null;
}

export async function generateMetadata({ params }: PageProps<"/courses/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return {};
  const m = await load(id);
  return { title: m?.title ?? "수업 자료" };
}

export default async function CourseDetailPage({ params }: PageProps<"/courses/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const m = await load(id);
  if (!m) notFound(); // 비공개 자료는 RLS 때문에 학생에게는 "없음"으로 보임

  const attachments = [...m.attachments].sort((a, b) => a.sort_order - b.sort_order);
  const images: GalleryImage[] = attachments
    .filter((a) => a.kind === "image" && a.storage_path)
    .map((a) => ({ id: a.id, src: a.storage_path!, thumb: a.thumb_path, alt: a.file_name, width: a.width, height: a.height }));
  const files = attachments.filter((a) => a.kind !== "image");
  const listHref = `/courses?semester=${encodeURIComponent(m.semester)}&course=${encodeURIComponent(m.course_name)}`;

  return (
    <article>
      <nav aria-label="위치" className="text-sm text-muted mb-8">
        <Link href="/courses" className="hover:text-ink">
          수업
        </Link>
        {" / "}
        <Link href={`/courses?semester=${encodeURIComponent(m.semester)}`} className="hover:text-ink">
          {m.semester}
        </Link>
        {" / "}
        <Link href={listHref} className="hover:text-ink">
          {m.course_name}
        </Link>
      </nav>

      <header className="border-b border-ink pb-10 mb-10">
        <p className="eyebrow mb-4 flex flex-wrap items-center gap-3">
          <span>
            {m.course_name} · {m.week ? `${m.week}주차` : "공통 자료"}
          </span>
          {m.audience === "admin_only" && <Badge tone="accent">{AUDIENCE_LABEL.admin_only}</Badge>}
        </p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.1] tracking-tight max-w-4xl">{m.title}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
          <span>{formatDate(m.created_at)} 등록</span>
          {me.role === "admin" && (
            <span className="flex gap-2">
              <Link href={`/courses/${m.id}/edit`} className={btn.small}>
                수정
              </Link>
              <form action={deleteCourseMaterial}>
                <input type="hidden" name="id" value={m.id} />
                <ConfirmButton variant="small" message="이 수업 자료와 첨부 파일, 댓글을 삭제할까요?">
                  삭제
                </ConfirmButton>
              </form>
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div className="min-w-0 max-w-3xl flex flex-col gap-12">
          {m.description ? <Markdown>{m.description}</Markdown> : null}
          {images.length > 0 && <ImageGallery images={images} />}
          {!m.description && images.length === 0 && files.length === 0 && (
            <p className="text-muted">내용이 없습니다.</p>
          )}
        </div>
        {files.length > 0 && (
          <aside aria-labelledby="files-title">
            <h2 id="files-title" className="eyebrow mb-3">
              자료 · 링크
            </h2>
            <AttachmentList items={files} />
          </aside>
        )}
      </div>

      <CommentSection target={{ type: "course", id: m.id }} me={me} />
    </article>
  );
}
