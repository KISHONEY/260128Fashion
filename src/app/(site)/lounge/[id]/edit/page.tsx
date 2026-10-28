import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LoungePost } from "@/lib/types";
import { LoungeForm } from "../../lounge-form";

export const metadata = { title: "라운지 글 수정" };

export default async function EditLoungePostPage({ params }: PageProps<"/lounge/[id]/edit">) {
  const me = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from("lounge_posts").select("*").eq("id", id).maybeSingle<LoungePost>();
  if (!post) notFound();
  if (post.author_id !== me.id) redirect(`/lounge/${id}`); // 본인 글만 수정
  return (
    <>
      <PageHeader eyebrow="Lab Lounge · Edit" title="글 수정" />
      <LoungeForm post={post} />
    </>
  );
}
