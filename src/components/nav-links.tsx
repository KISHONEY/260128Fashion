"use client";

// 상단 메뉴 (현재 위치 강조) + 모바일 전체화면 메뉴
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavItem = { href: string; label: string; en: string };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function DesktopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="주 메뉴" className="hidden md:flex items-center gap-7">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative text-sm py-1 transition-colors ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
            {active && <span className="absolute left-0 right-0 -bottom-[1.15rem] h-[2px] bg-accent" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({
  items,
  userName,
}: {
  items: NavItem[];
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 페이지를 이동하면 메뉴를 닫음
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 메뉴가 열려 있을 때 뒤 화면 스크롤 막기 + ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="h-10 w-10 -mr-2 flex items-center justify-center"
      >
        <span className="sr-only">메뉴 열기</span>
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          <path d="M2 7h18M2 15h18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="메뉴"
          className="fixed inset-0 z-50 bg-paper flex flex-col px-6 pt-5 pb-8 overflow-y-auto"
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 w-10 -mr-2 flex items-center justify-center"
            >
              <span className="sr-only">메뉴 닫기</span>
              <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
                <path d="M4 4l14 14M18 4L4 18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
          <nav aria-label="모바일 메뉴" className="mt-10 flex flex-col">
            {items.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className="border-b border-line py-4 flex items-baseline gap-4"
              >
                <span className="text-xs text-accent w-6">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-serif text-3xl">{item.label}</span>
                <span className="ml-auto eyebrow">{item.en}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-10 flex items-center justify-between text-sm">
            <Link href="/settings" className="text-muted">
              {userName} · 내 정보
            </Link>
            <form action="/auth/signout" method="post">
              <button className="underline underline-offset-4">로그아웃</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
