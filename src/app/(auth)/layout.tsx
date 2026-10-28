// 로그인/가입 화면 공통 레이아웃 — 왼쪽은 매거진 표지 같은 타이포그래피, 오른쪽은 입력 폼
import { SITE_NAME } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh grid md:grid-cols-[1.1fr_1fr]">
      <section className="relative bg-ink text-paper px-6 py-10 md:p-14 flex flex-col justify-between min-h-[38vh] md:min-h-dvh overflow-hidden">
        <p className="eyebrow !text-paper/60">Fashion Design Research Archive</p>
        <div>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
            Archive
            <br />
            <em className="text-paper/70">&amp; Dialogue</em>
          </h1>
          <p className="mt-6 max-w-sm text-paper/70 leading-relaxed text-sm md:text-base">
            {SITE_NAME} — 연구와 수업의 기록, 그리고 연구실의 대화가 모이는 곳.
          </p>
        </div>
        <p className="hidden md:block text-xs text-paper/40">초대받은 연구실 구성원만 이용할 수 있습니다.</p>
        {/* 장식용 큰 글자 */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-10 font-serif text-[12rem] md:text-[18rem] leading-none text-paper/5 select-none"
        >
          A
        </span>
      </section>
      <section className="flex items-center justify-center px-6 py-12 md:p-14">
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
}
