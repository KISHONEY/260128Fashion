import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Noto_Serif_KR } from "next/font/google";
import { SITE_NAME } from "@/lib/constants";
import "./globals.css";

// 제목용 세리프 서체
// - 영문/숫자: Cormorant Garamond (패션 매거진 느낌의 디스플레이 세리프)
// - 한글: Noto Serif KR (본명조)
const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});
const serifKr = Noto_Serif_KR({
  variable: "--font-serif-kr",
  weight: ["400", "600"],
  preload: false, // 한글 글꼴은 용량이 커서 필요한 글자만 나눠 받습니다
});

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: "패션디자인 연구실의 연구 자료와 수업 자료, 그리고 토론 공간",
  // 비공개 사이트이므로 검색엔진 수집 금지
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${display.variable} ${serifKr.variable} h-full antialiased`}>
      <head>
        {/* 본문 서체: Pretendard (한글 가독성이 좋은 오픈소스 서체, CDN 으로 필요한 글자만 로드) */}
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
