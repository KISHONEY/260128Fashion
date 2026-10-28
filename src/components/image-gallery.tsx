"use client";

// 이미지 갤러리 + 크게 보기(라이트박스)
// - 첫 이미지는 크게, 나머지는 격자로
// - 클릭하면 화면 가득 보기, ← → 키 / 스와이프로 넘기기, ESC 로 닫기
import { useCallback, useEffect, useRef, useState } from "react";
import { fileUrl } from "@/lib/format";

export type GalleryImage = {
  id: string;
  src: string; // storage_path
  thumb: string | null;
  alt: string;
  width: number | null;
  height: number | null;
};

export function ImageGallery({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);

  const show = (i: number) => {
    lastFocus.current = document.activeElement as HTMLElement;
    setOpen(i);
  };
  const close = useCallback(() => {
    setOpen(null);
    lastFocus.current?.focus();
  }, []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (open === null) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  if (!images.length) return null;
  const [first, ...rest] = images;

  return (
    <>
      <figure>
        <button type="button" onClick={() => show(0)} className="block w-full bg-paper-deep cursor-zoom-in" aria-label={`${first.alt} 크게 보기`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl(first.src)}
            alt={first.alt}
            width={first.width ?? undefined}
            height={first.height ?? undefined}
            className="w-full h-auto max-h-[85vh] object-contain mx-auto"
          />
        </button>
      </figure>
      {rest.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {rest.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => show(i + 1)}
                className="block w-full aspect-[4/5] bg-paper-deep overflow-hidden cursor-zoom-in"
                aria-label={`${img.alt} 크게 보기`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(img.thumb ?? img.src)} alt="" loading="lazy" className="h-full w-full object-cover hover:opacity-85 transition-opacity" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="이미지 크게 보기"
          className="fixed inset-0 z-50 bg-ink/95 text-paper flex flex-col"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="flex items-center justify-between px-5 h-14 shrink-0 text-sm">
            <span aria-live="polite">
              {open + 1} / {images.length}
            </span>
            <div className="flex items-center gap-4">
              <a href={fileUrl(images[open].src, { download: true })} className="underline underline-offset-4">
                원본 받기
              </a>
              <button ref={closeRef} type="button" onClick={close} className="h-10 w-10 flex items-center justify-center" aria-label="닫기">
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
                  <path d="M4 4l14 14M18 4L4 18" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
          </div>
          <div className="relative flex-1 flex items-center justify-center px-2 md:px-16 pb-6 min-h-0" onClick={(e) => e.target === e.currentTarget && close()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl(images[open].src)} alt={images[open].alt} className="max-h-full max-w-full object-contain" />
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="이전 이미지" className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center text-2xl hover:text-paper/70">
                  ←
                </button>
                <button type="button" onClick={() => step(1)} aria-label="다음 이미지" className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center text-2xl hover:text-paper/70">
                  →
                </button>
              </>
            )}
          </div>
          <p className="px-5 pb-5 text-center text-xs text-paper/60 truncate">{images[open].alt}</p>
        </div>
      )}
    </>
  );
}
