// 현재 사이트 주소 (예: https://내사이트.vercel.app)
// 환경변수 NEXT_PUBLIC_SITE_URL 이 있으면 그 값을, 없으면 접속한 주소에서 알아냅니다.
import "server-only";
import { headers } from "next/headers";

export async function siteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
