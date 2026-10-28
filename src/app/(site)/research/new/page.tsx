import { randomUUID } from "crypto";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { ResearchForm } from "../research-form";

export const metadata = { title: "연구 자료 등록" };

export default async function NewResearchPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("tags").select("name").order("name"),
  ]);

  return (
    <>
      <PageHeader eyebrow="Research · New" title="연구 자료 등록" />
      {/* 새 자료의 ID 를 미리 만들어 두고, 파일을 그 폴더에 업로드합니다 */}
      <ResearchForm
        mode="new"
        id={randomUUID()}
        categories={(categories ?? []) as Category[]}
        tags={[]}
        allTags={(tags ?? []).map((t) => t.name)}
        attachments={[]}
      />
    </>
  );
}
