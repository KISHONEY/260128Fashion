import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Attachment, Category, Research } from "@/lib/types";
import { ResearchForm } from "../../research-form";

export const metadata = { title: "연구 자료 수정" };

export default async function EditResearchPage({ params }: PageProps<"/research/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data: research } = await supabase.from("research").select("*").eq("id", id).maybeSingle<Research>();
  if (!research) notFound();

  const [{ data: categories }, { data: allTags }, { data: tagLinks }, { data: attachments }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("tags").select("name").order("name"),
    supabase.from("research_tags").select("tag:tags(name)").eq("research_id", id),
    supabase.from("attachments").select("*").eq("research_id", id).order("sort_order"),
  ]);

  const tagNames = (tagLinks ?? [])
    .map((l) => (l.tag as unknown as { name: string } | null)?.name)
    .filter(Boolean) as string[];

  return (
    <>
      <PageHeader eyebrow="Research · Edit" title="연구 자료 수정" />
      <ResearchForm
        mode="edit"
        id={id}
        research={research}
        categories={(categories ?? []) as Category[]}
        tags={tagNames}
        allTags={(allTags ?? []).map((t) => t.name)}
        attachments={(attachments ?? []) as Attachment[]}
      />
    </>
  );
}
