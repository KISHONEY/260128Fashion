import type { NextConfig } from "next";

// Next.js 설정
// - 이 사이트는 모든 화면이 "로그인한 사용자별" 데이터이므로
//   Cache Components(정적 프리렌더링)를 사용하지 않고 요청마다 서버에서 그립니다.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // 기본 보안 헤더
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
