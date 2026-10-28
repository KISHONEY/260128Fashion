// 상단 머리글 (로고, 메뉴, 알림, 사용자 메뉴)
import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";
import { DesktopNav, MobileNav, type NavItem } from "./nav-links";

export function SiteHeader({ user, unread }: { user: CurrentUser; unread: number }) {
  const items: NavItem[] = [
    { href: "/", label: "홈", en: "Home" },
    { href: "/research", label: "연구", en: "Research" },
    { href: "/courses", label: "수업", en: "Courses" },
    { href: "/lounge", label: "라운지", en: "Lounge" },
  ];
  if (user.role === "admin") items.push({ href: "/admin", label: "관리", en: "Admin" });

  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80 border-b border-line">
      <div className="mx-auto max-w-7xl px-5 md:px-10 h-16 flex items-center gap-6">
        <Link href="/" className="font-serif text-xl md:text-2xl tracking-tight shrink-0">
          {SITE_NAME}
        </Link>
        <div className="flex-1 flex justify-center">
          <DesktopNav items={items} />
        </div>
        <div className="flex items-center gap-1 md:gap-3">
          <Link
            href="/notifications"
            className="relative h-10 w-10 flex items-center justify-center"
            aria-label={unread > 0 ? `알림 ${unread}개 읽지 않음` : "알림"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 9a6 6 0 1 1 12 0c0 5 2 7 2 7H4s2-2 2-7Zm4 11a2 2 0 0 0 4 0"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
            {unread > 0 && (
              <span className="absolute top-1 right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-accent text-accent-ink text-[0.65rem] leading-[1.1rem] text-center">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          {/* 데스크톱 사용자 메뉴 */}
          <details className="relative hidden md:block group">
            <summary className="list-none cursor-pointer text-sm flex items-center gap-2 h-10 [&::-webkit-details-marker]:hidden">
              <span className="h-8 w-8 rounded-full border border-ink flex items-center justify-center font-serif">
                {user.display_name.slice(0, 1)}
              </span>
              <span className="sr-only">사용자 메뉴</span>
            </summary>
            <div className="absolute right-0 mt-2 w-52 bg-paper border border-ink shadow-[4px_4px_0_0_var(--ink)] py-2 text-sm">
              <p className="px-4 py-2 border-b border-line">
                <span className="block">{user.display_name}</span>
                <span className="text-xs text-muted">{user.role === "admin" ? "교수(관리자)" : "대학원생"}</span>
              </p>
              <Link href="/settings" className="block px-4 py-2 hover:bg-paper-deep">
                내 정보 설정
              </Link>
              <form action="/auth/signout" method="post">
                <button className="w-full text-left px-4 py-2 hover:bg-paper-deep">로그아웃</button>
              </form>
            </div>
          </details>
          <MobileNav items={items} userName={user.display_name} />
        </div>
      </div>
    </header>
  );
}
