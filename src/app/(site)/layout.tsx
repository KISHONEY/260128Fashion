// 로그인한 사용자용 화면의 공통 레이아웃 (머리글 + 본문 + 바닥글)
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:text-paper focus:px-4 focus:py-2"
      >
        본문으로 건너뛰기
      </a>
      <SiteHeader user={user} unread={count ?? 0} />
      <main id="main" className="flex-1 mx-auto w-full max-w-7xl px-5 md:px-10 py-10 md:py-16">
        {children}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto max-w-7xl px-5 md:px-10 py-8 flex flex-col md:flex-row gap-2 justify-between text-xs text-muted">
          <span className="font-serif text-sm text-ink">{SITE_NAME}</span>
          <span>연구실 구성원 전용 비공개 사이트입니다. 자료를 외부에 공유하지 말아 주세요.</span>
        </div>
      </footer>
    </>
  );
}
