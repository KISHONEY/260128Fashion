"use client";

// 하위 메뉴 (현재 위치 강조)
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubNav({ items, label }: { items: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mt-6 mb-12 flex gap-6 text-sm overflow-x-auto whitespace-nowrap border-b border-line">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`pb-3 -mb-px border-b-2 ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
