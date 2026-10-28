// Supabase 접속 정보 읽기
// - 우선 src/config.ts 의 값을 사용하고,
// - 환경변수(NEXT_PUBLIC_SUPABASE_URL 등)가 있으면 그 값을 우선합니다. (선택 사항)
import * as config from "@/config";

// NEXT_PUBLIC_ 값은 빌드 때 코드에 채워지므로 process.env.이름 형태로 그대로 적어야 합니다.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || config.SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || config.SUPABASE_PUBLISHABLE_KEY;

// config.ts 에 실제 값이 들어갔는지 확인 (예시 문구 그대로면 false)
export function isConfigured() {
  return (
    /^https?:\/\/[^\s]+$/.test(SUPABASE_URL) &&
    !SUPABASE_URL.includes("여기에") &&
    SUPABASE_PUBLISHABLE_KEY.length > 20 &&
    !SUPABASE_PUBLISHABLE_KEY.includes("여기에")
  );
}

export const NOT_CONFIGURED_MESSAGE =
  "Supabase 접속 정보가 아직 입력되지 않았습니다. GitHub 에서 src/config.ts 파일을 열어 Project URL 과 Publishable key 를 넣어 주세요.";
