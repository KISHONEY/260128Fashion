// 환경변수 읽기 — 값이 없으면 어떤 값을 넣어야 하는지 한국어로 알려 줍니다.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `환경변수 ${name} 가 설정되지 않았습니다. .env.local 파일(로컬) 또는 Vercel 의 Environment Variables 를 확인하세요.`,
    );
  }
  return value;
}

// NEXT_PUBLIC_ 으로 시작하는 값은 브라우저에서도 쓰이므로
// process.env.이름 형태로 "그대로" 적어야 빌드 시 값이 채워집니다.
export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);
export const SUPABASE_PUBLISHABLE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
