// 사이트 전체에서 쓰는 기본 UI 조각들 (버튼 스타일, 페이지 머리말, 입력칸 등)
import Link from "next/link";
import type { ReactNode } from "react";

// 버튼 스타일 — <button> 과 <Link> 모두에 className 으로 씁니다.
export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 bg-ink text-paper px-5 h-11 text-sm tracking-wide hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none",
  secondary:
    "inline-flex items-center justify-center gap-2 border border-ink px-5 h-11 text-sm tracking-wide hover:bg-ink hover:text-paper transition-colors disabled:opacity-50 disabled:pointer-events-none",
  ghost:
    "inline-flex items-center justify-center gap-1.5 px-2 h-9 text-sm text-muted hover:text-ink underline-offset-4 hover:underline disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 border border-accent text-accent px-5 h-11 text-sm hover:bg-accent hover:text-accent-ink transition-colors disabled:opacity-50",
  small:
    "inline-flex items-center justify-center gap-1.5 border border-line px-3 h-9 text-sm hover:border-ink transition-colors disabled:opacity-50",
};

// 입력칸 공통 스타일
export const inputCls =
  "w-full bg-transparent border-0 border-b border-line focus:border-ink focus:outline-none focus-visible:outline-none px-0 py-2.5 text-base placeholder:text-muted/70 transition-colors";
export const boxInputCls =
  "w-full bg-white/60 border border-line focus:border-ink focus:outline-none focus-visible:outline-none px-3 py-2.5 text-base placeholder:text-muted/70 transition-colors";

// 페이지 머리말: 작은 소제목 + 큰 세리프 제목 + 설명 + 우측 버튼
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-ink pb-6 mb-10 md:mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.1] tracking-tight">{title}</h1>
        {description && <p className="mt-4 text-muted leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

// 섹션 제목 (번호 + 제목 + 더보기 링크)
export function SectionTitle({
  index,
  title,
  href,
  linkLabel = "전체 보기",
}: {
  index?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-line pb-3 mb-6">
      <h2 className="font-serif text-2xl md:text-3xl">
        {index && <span className="text-accent text-base align-top mr-3 font-sans">{index}</span>}
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-sm text-muted hover:text-ink whitespace-nowrap">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

// 입력 항목 (라벨 + 입력칸 + 도움말)
export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="eyebrow">
        {label}
        {required && <span className="text-accent ml-1" aria-hidden>*</span>}
        {required && <span className="sr-only">(필수)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted leading-relaxed">{hint}</p>}
    </div>
  );
}

// 오류/성공 메시지
export function FormMessage({ state }: { state?: { error?: string; success?: string } }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={
        state.error
          ? "text-sm text-accent border-l-2 border-accent pl-3 py-1"
          : "text-sm text-ink border-l-2 border-ink pl-3 py-1"
      }
    >
      {state.error ?? state.success}
    </p>
  );
}

// 내용이 없을 때 안내
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-line py-16 px-6 text-center">
      <p className="font-serif text-xl">{title}</p>
      {children && <div className="mt-3 text-sm text-muted">{children}</div>}
    </div>
  );
}

// 작은 라벨 (상태, 카테고리 등)
export function Badge({ children, tone = "line" }: { children: ReactNode; tone?: "line" | "accent" | "ink" }) {
  const cls =
    tone === "accent"
      ? "border-accent text-accent"
      : tone === "ink"
        ? "border-ink bg-ink text-paper"
        : "border-line text-muted";
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[0.7rem] tracking-wider ${cls}`}>
      {children}
    </span>
  );
}
