// 업로드된 파일을 보여 주는 주소: /files/research/<id>/<파일>
//
// Storage 버킷은 "비공개"이며, 이 경로를 통해서만 파일을 볼 수 있습니다.
// - 로그인한 사용자의 권한(RLS)으로 파일을 조회하므로,
//   로그인하지 않았거나 권한이 없으면 404 를 돌려줍니다.
// - 이미지는 서버가 직접 전달(브라우저 캐시는 개인용으로만 허용)
// - PDF/문서는 60초 뒤 만료되는 일회용 주소로 넘겨 줍니다.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "archive";

export async function GET(request: NextRequest, ctx: RouteContext<"/files/[...path]">) {
  const { path: segments } = await ctx.params;
  const path = segments.join("/");
  if (!path || segments.some((s) => s === ".." || s === ".")) {
    return new NextResponse("잘못된 경로입니다.", { status: 400 });
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return new NextResponse("로그인이 필요합니다.", { status: 401 });
  }

  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
  const isImage = /\.(jpe?g|png|webp|gif)$/i.test(path);

  if (isImage && !wantsDownload) {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) return new NextResponse("파일을 찾을 수 없습니다.", { status: 404 });
    return new NextResponse(data.stream(), {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Content-Length": String(data.size),
        // private: 공유 캐시(CDN)에 저장하지 않고 본인 브라우저에만 1시간 보관
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
      },
    });
  }

  // 문서: 원래 파일 이름으로 내려받을 수 있도록 첨부 정보에서 이름을 찾음 (RLS 적용)
  let downloadName: string | boolean = wantsDownload;
  if (wantsDownload) {
    const { data: att } = await supabase
      .from("attachments")
      .select("file_name")
      .eq("storage_path", path)
      .maybeSingle();
    if (att?.file_name) downloadName = att.file_name;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60, downloadName ? { download: downloadName } : undefined);
  if (error || !data?.signedUrl) {
    return new NextResponse("파일을 찾을 수 없습니다.", { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
