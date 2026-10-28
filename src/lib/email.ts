// (선택) 멘션 이메일 알림 — Resend(https://resend.com) API 를 fetch 로 직접 호출
// RESEND_API_KEY, EMAIL_FROM, SUPABASE_SECRET_KEY 환경변수가 모두 있을 때만 동작하고,
// 없으면 아무것도 하지 않습니다. (사이트 안의 알림은 이와 상관없이 항상 동작)
// 멘션한 사람은 다른 멤버의 이메일을 볼 권한이 없으므로 Secret 키로 조회합니다.
import "server-only";
import { siteUrl } from "./site-url";
import { createAdminClient, hasAdminKey } from "./supabase/admin";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendMentionEmails(params: {
  userIds: string[];
  actorName: string;
  link: string; // 예: /research/<id>#comment-<id>
  excerpt: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from || !hasAdminKey() || params.userIds.length === 0) return;

  try {
    const admin = createAdminClient();
    // 이메일 알림을 켜 둔 사람만
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, member_emails(email)")
      .in("id", params.userIds)
      .eq("email_notify", true);

    const url = (await siteUrl()) + params.link;
    const html = `
      <div style="font-family:sans-serif;line-height:1.7;color:#171614">
        <p><strong>${escapeHtml(params.actorName)}</strong>님이 회원님을 언급했습니다.</p>
        <blockquote style="border-left:2px solid #8b2c20;margin:0;padding-left:12px;color:#6d6860">
          ${escapeHtml(params.excerpt)}
        </blockquote>
        <p><a href="${url}" style="color:#8b2c20">댓글 보러 가기</a></p>
        <p style="font-size:12px;color:#6d6860">이메일 알림은 사이트의 [내 정보 설정]에서 끌 수 있습니다.</p>
      </div>`;

    await Promise.all(
      (profiles ?? []).map(async (p) => {
        const row = p.member_emails as unknown as { email: string } | { email: string }[] | null;
        const to = Array.isArray(row) ? row[0]?.email : row?.email;
        if (!to) return;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to,
            subject: `[연구 아카이브] ${params.actorName}님이 회원님을 언급했습니다`,
            html,
          }),
        });
      }),
    );
  } catch (e) {
    // 이메일 실패가 댓글 작성을 막지 않도록 기록만 남김
    console.error("멘션 이메일 전송 실패", e);
  }
}
