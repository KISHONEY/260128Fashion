// 카테고리 · 태그 관리
import { ConfirmButton } from "@/components/confirm-button";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { deleteCategory, deleteTag } from "../actions";
import { CategoryForm, TagForm } from "../forms";

export const metadata = { title: "카테고리 · 태그 관리" };

export default async function TaxonomyPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from("categories").select("*, research(count)").order("sort_order"),
    supabase.from("tags").select("id, name, research_tags(count)").order("name"),
  ]);
  const cats = (categories ?? []) as (Category & { research: { count: number }[] })[];
  const tagRows = (tags ?? []) as { id: string; name: string; research_tags: { count: number }[] }[];

  return (
    <div className="grid gap-16 lg:grid-cols-2">
      <section aria-labelledby="cat-title">
        <h2 id="cat-title" className="font-serif text-3xl mb-2">
          카테고리
        </h2>
        <p className="text-sm text-muted mb-6">연구 자료를 분류하는 큰 갈래입니다. 숫자가 작을수록 앞에 표시됩니다.</p>
        <div className="mb-6">
          <CategoryForm />
        </div>
        <ul className="border-t border-ink">
          {cats.map((c) => (
            <li key={c.id} className="border-b border-line py-3 flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1">
                <CategoryForm category={c} />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted sm:pt-3">
                <span>자료 {c.research?.[0]?.count ?? 0}건</span>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton message={`"${c.name}" 카테고리를 삭제할까요? 연결된 자료는 '미분류'가 됩니다.`}>
                    삭제
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tag-title">
        <h2 id="tag-title" className="font-serif text-3xl mb-2">
          태그
        </h2>
        <p className="text-sm text-muted mb-6">태그는 연구 자료를 등록할 때 자동으로도 만들어집니다.</p>
        <div className="mb-6">
          <TagForm />
        </div>
        {tagRows.length === 0 ? (
          <p className="text-sm text-muted">아직 태그가 없습니다.</p>
        ) : (
          <ul className="border-t border-ink">
            {tagRows.map((t) => (
              <li key={t.id} className="border-b border-line py-3 flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <TagForm tag={t} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted sm:pt-3">
                  <span>자료 {t.research_tags?.[0]?.count ?? 0}건</span>
                  <form action={deleteTag}>
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmButton message={`#${t.name} 태그를 삭제할까요?`}>삭제</ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
