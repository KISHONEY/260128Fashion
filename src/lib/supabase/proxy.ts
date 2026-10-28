// 요청마다 실행되어 (1) 로그인 세션을 갱신하고 (2) 비로그인 사용자를
// 로그인 페이지로 보내는 함수. src/proxy.ts 에서 호출합니다.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

// 로그인 없이 접근할 수 있는 경로 (이 외에는 전부 로그인 필요)
const PUBLIC_PATHS = ["/login", "/join", "/auth/confirm", "/auth/error"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // 주의: createServerClient 와 getClaims 사이에 다른 코드를 넣지 마세요.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (!loggedIn && !isPublic(pathname)) {
    // 파일 주소(/files/...)를 직접 열면 HTML 대신 401 을 돌려줍니다.
    if (pathname.startsWith("/files/")) {
      return new NextResponse("로그인이 필요합니다.", { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // 이미 로그인했는데 로그인/가입 화면에 오면 홈으로
  if (loggedIn && (pathname === "/login" || pathname === "/join")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
