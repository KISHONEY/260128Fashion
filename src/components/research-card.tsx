// 연구 자료 카드(갤러리) / 행(목록) 표시
import Link from "next/link";
import { STATUS_LABEL } from "@/lib/constants";
import { fileUrl } from "@/lib/format";
import type { ResearchStatus } from "@/lib/types";

export type ResearchListItem = {
  id: string;
  title: string;
  summary: string;
  year: number | null;
  status: ResearchStatus;
  cover_path: string | null;
  category: { name: string } | null;
  tags: { tag: { name: string } | null }[];
};

// 이미지가 없을 때 보여 줄 타이포그래피 표지
function TypeCover({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex items-end p-5 bg-paper-deep">
      <span className="font-serif text-2xl leading-tight text-ink/80 line-clamp-4">{title}</span>
    </div>
  );
}

export function ResearchCard({ item, priority = false }: { item: ResearchListItem; priority?: boolean }) {
  return (
    <article className="group">
      <Link href={`/research/${item.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-paper-deep">
          {item.cover_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl(item.cover_path)}
              alt=""
              loading={priority ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <TypeCover title={item.title} />
          )}
          <span className="absolute top-3 left-3 bg-paper/90 px-2 py-0.5 text-[0.68rem] tracking-wider">
            {STATUS_LABEL[item.status]}
          </span>
        </div>
        <div className="pt-4">
          <p className="eyebrow">
            {item.category?.name ?? "미분류"}
            {item.year ? ` · ${item.year}` : ""}
          </p>
          <h3 className="mt-2 font-serif text-xl md:text-2xl leading-snug group-hover:text-accent transition-colors">
            {item.title}
          </h3>
          {item.summary && <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-2">{item.summary}</p>}
        </div>
      </Link>
    </article>
  );
}

export function ResearchRow({ item }: { item: ResearchListItem }) {
  const tags = item.tags.map((t) => t.tag?.name).filter(Boolean);
  return (
    <li>
      <Link
        href={`/research/${item.id}`}
        className="group grid grid-cols-[4rem_1fr] md:grid-cols-[5rem_1fr_10rem_5rem] gap-x-5 gap-y-1 py-5 border-b border-line items-start"
      >
        <span className="font-serif text-2xl text-muted md:row-span-1">{item.year ?? "—"}</span>
        <div className="min-w-0">
          <h3 className="font-serif text-xl leading-snug group-hover:text-accent transition-colors">{item.title}</h3>
          {item.summary && <p className="mt-1 text-sm text-muted line-clamp-2">{item.summary}</p>}
          {tags.length > 0 && <p className="mt-2 text-xs text-muted">{tags.map((t) => `#${t}`).join("  ")}</p>}
        </div>
        <span className="col-start-2 md:col-start-auto text-sm text-muted">{item.category?.name ?? "미분류"}</span>
        <span className="col-start-2 md:col-start-auto text-xs tracking-wider text-accent">{STATUS_LABEL[item.status]}</span>
      </Link>
    </li>
  );
}
