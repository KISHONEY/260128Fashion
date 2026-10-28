// 연구 자료 목록: 갤러리/목록 보기, 카테고리·태그·연도 필터, 키워드 검색
import Link from "next/link";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { ResearchCard, ResearchRow, type ResearchListItem } from "@/components/research-card";
import { EmptyState, PageHeader, boxInputCls, btn } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category, Tag } from "@/lib/types";

export const metadata = { title: "연구" };

const PAGE_SIZE = 24;

// 검색어에서 PostgREST 필터 문법을 깨뜨릴 수 있는 문자 제거
function cleanQuery(q: string) {
  return q.replace(/[%_*,()"'\\:.]/g, " ").trim().slice(0, 60);
}

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function ResearchListPage({ searchParams }: PageProps<"/research">) {
  const sp = await searchParams;
  const q = cleanQuery(str(sp.q));
  const category = str(sp.category);
  const tag = str(sp.tag);
  const year = str(sp.year);
  const view = str(sp.view) === "list" ? "list" : "grid";
  const page = Math.max(1, Number(str(sp.page)) || 1);

  const user = await getCurrentUser();
  const supabase = await createClient();

  // 태그로 거를 때는 research_tags 를 inner join 으로 한 번 더 붙입니다
  const select =
    "id, title, summary, year, status, cover_path, created_at, category:categories(name), tags:research_tags(tag:tags(name))" +
    (tag ? ", tag_filter:research_tags!inner(tag_id)" : "");
  let query = supabase.from("research").select(select, { count: "exact" });
  if (category) query = query.eq("category_id", category);
  if (year) query = query.eq("year", Number(year));
  if (tag) query = query.eq("tag_filter.tag_id", tag);
  if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,body.ilike.%${q}%`);
  query = query
    .order("year", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const [{ data, count }, { data: categories }, { data: tags }, { data: years }] = await Promise.all([
    query,
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("tags").select("id, name").order("name"),
    supabase.from("research").select("year").not("year", "is", null).order("year", { ascending: false }),
  ]);
  const items = (data ?? []) as unknown as ResearchListItem[];
  const yearOptions = [...new Set((years ?? []).map((y) => y.year as number))];
  const total = count ?? 0;
  const hasFilter = Boolean(q || category || tag || year);

  // 현재 필터를 유지한 채 일부 값만 바꾼 주소 만들기
  const href = (patch: Record<string, string>) => {
    const params = new URLSearchParams();
    const merged = { q, category, tag, year, view, ...patch };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && !(k === "view" && v === "grid")) params.set(k, v);
    });
    const s = params.toString();
    return s ? `/research?${s}` : "/research";
  };

  return (
    <>
      <PageHeader
        eyebrow="Research Archive"
        title="연구"
        description="진행 중인 연구부터 출판된 결과까지, 연구실의 작업을 모았습니다."
        actions={
          user?.role === "admin" && (
            <Link href="/research/new" className={btn.primary}>
              + 연구 자료 등록
            </Link>
          )
        }
      />

      {/* 카테고리: 잡지 목차처럼 가로로 나열 */}
      <nav aria-label="카테고리" className="-mx-5 px-5 md:mx-0 md:px-0 overflow-x-auto">
        <ul className="flex gap-6 whitespace-nowrap text-sm pb-4">
          <li>
            <Link
              href={href({ category: "", page: "" })}
              aria-current={!category ? "page" : undefined}
              className={!category ? "text-ink border-b border-accent pb-1" : "text-muted hover:text-ink"}
            >
              전체
            </Link>
          </li>
          {((categories ?? []) as Category[]).map((c) => (
            <li key={c.id}>
              <Link
                href={href({ category: c.id, page: "" })}
                aria-current={category === c.id ? "page" : undefined}
                className={category === c.id ? "text-ink border-b border-accent pb-1" : "text-muted hover:text-ink"}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 검색 + 연도/태그 필터 (자바스크립트가 없어도 동작하는 GET 폼) */}
      <form action="/research" method="get" role="search" className="flex flex-col gap-3 md:flex-row md:items-center border-y border-line py-4 mb-10">
        {category && <input type="hidden" name="category" value={category} />}
        {view === "list" && <input type="hidden" name="view" value="list" />}
        <div className="flex flex-1 gap-2">
          <label htmlFor="q" className="sr-only">
            키워드 검색
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="제목, 요약, 본문 검색" className={`${boxInputCls} flex-1`} />
          <button className={btn.small + " h-auto px-4"}>검색</button>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <label className="sr-only" htmlFor="year">
            연도
          </label>
          <AutoSubmitSelect id="year" name="year" defaultValue={year} className={`${boxInputCls} md:w-32`}>
            <option value="">모든 연도</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </AutoSubmitSelect>
          <label className="sr-only" htmlFor="tag">
            태그
          </label>
          <AutoSubmitSelect id="tag" name="tag" defaultValue={tag} className={`${boxInputCls} md:w-40`}>
            <option value="">모든 태그</option>
            {((tags ?? []) as Tag[]).map((t) => (
              <option key={t.id} value={t.id}>
                #{t.name}
              </option>
            ))}
          </AutoSubmitSelect>
        </div>
        <noscript>
          <button className={btn.small}>적용</button>
        </noscript>
      </form>

      <div className="flex items-center justify-between mb-6 text-sm">
        <p className="text-muted">
          {total}건{hasFilter && (
            <>
              {" · "}
              <Link href={view === "list" ? "/research?view=list" : "/research"} className="underline underline-offset-4 hover:text-ink">
                필터 초기화
              </Link>
            </>
          )}
        </p>
        <div className="flex gap-1" role="group" aria-label="보기 방식">
          <Link
            href={href({ view: "grid", page: "" })}
            aria-current={view === "grid" ? "true" : undefined}
            className={`px-3 py-1.5 border ${view === "grid" ? "border-ink" : "border-transparent text-muted"}`}
          >
            갤러리
          </Link>
          <Link
            href={href({ view: "list", page: "" })}
            aria-current={view === "list" ? "true" : undefined}
            className={`px-3 py-1.5 border ${view === "list" ? "border-ink" : "border-transparent text-muted"}`}
          >
            목록
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title={hasFilter ? "조건에 맞는 연구 자료가 없습니다" : "아직 등록된 연구 자료가 없습니다"}>
          {user?.role === "admin" && !hasFilter && <p>오른쪽 위 [+ 연구 자료 등록] 버튼으로 첫 자료를 올려 보세요.</p>}
        </EmptyState>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 md:gap-x-8 gap-y-12 md:gap-y-16">
          {items.map((item, i) => (
            <ResearchCard key={item.id} item={item} priority={i < 3} />
          ))}
        </div>
      ) : (
        <ul className="border-t border-ink">
          {items.map((item) => (
            <ResearchRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <nav aria-label="페이지" className="mt-14 flex justify-center items-center gap-6 text-sm">
          {page > 1 ? (
            <Link href={href({ page: String(page - 1) })} className={btn.small}>
              ← 이전
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            {page} / {Math.ceil(total / PAGE_SIZE)}
          </span>
          {page * PAGE_SIZE < total ? (
            <Link href={href({ page: String(page + 1) })} className={btn.small}>
              다음 →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
