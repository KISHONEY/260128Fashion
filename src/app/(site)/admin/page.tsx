// 관리: 멤버 목록(권한 변경·제거) + 초대(초대 코드 / 이메일)
import { ConfirmButton } from "@/components/confirm-button";
import { Badge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { siteUrl } from "@/lib/site-url";
import { hasAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { InviteCode, Profile } from "@/lib/types";
import { deleteInviteCode, removeMember } from "./actions";
import { CopyButton, InviteCodeForm, InviteEmailForm, RoleForm } from "./forms";

export const metadata = { title: "멤버 · 초대 관리" };

function isExpired(expiresAt: string | null) {
  return expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
}

export default async function AdminMembersPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const [{ data: profiles }, { data: codes }, { data: emailRows }] = await Promise.all([
    supabase.from("profiles").select("*").order("role").order("created_at"),
    supabase.from("invite_codes").select("*").order("created_at", { ascending: false }),
    // 이메일은 교수만 볼 수 있는 별도 표에 있습니다 (RLS)
    supabase.from("member_emails").select("id, email"),
  ]);
  const emails = new Map((emailRows ?? []).map((r) => [r.id as string, r.email as string]));
  const base = await siteUrl();
  const emailInviteEnabled = hasAdminKey();

  const members = (profiles ?? []) as Profile[];
  const inviteCodes = (codes ?? []) as InviteCode[];

  return (
    <div className="flex flex-col gap-20">
      <section aria-labelledby="members-title">
        <div className="flex items-baseline justify-between mb-6">
          <h2 id="members-title" className="font-serif text-3xl">
            멤버
          </h2>
          <span className="text-sm text-muted">{members.length}명</span>
        </div>
        <div className="overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
          <table className="w-full text-sm min-w-[40rem]">
            <thead>
              <tr className="border-b border-ink text-left">
                <th scope="col" className="eyebrow py-3 font-normal">이름</th>
                <th scope="col" className="eyebrow py-3 font-normal">이메일</th>
                <th scope="col" className="eyebrow py-3 font-normal">가입일</th>
                <th scope="col" className="eyebrow py-3 font-normal">권한</th>
                <th scope="col" className="py-3"><span className="sr-only">관리</span></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const email = emails.get(m.id);
                const isMe = m.id === me.id;
                return (
                  <tr key={m.id} className="border-b border-line">
                    <td className="py-3 pr-4">
                      {m.display_name}
                      {isMe && <span className="ml-2 text-xs text-muted">(나)</span>}
                    </td>
                    <td className="py-3 pr-4 text-muted">{email || "—"}</td>
                    <td className="py-3 pr-4 text-muted whitespace-nowrap">{formatDate(m.created_at)}</td>
                    <td className="py-3 pr-4">
                      <RoleForm id={m.id} role={m.role} disabled={isMe} />
                    </td>
                    <td className="py-3 text-right">
                      {!isMe && (
                        <form action={removeMember}>
                          <input type="hidden" name="id" value={m.id} />
                          <ConfirmButton
                            message={`${m.display_name} 님을 멤버에서 제거할까요? 더 이상 사이트에 접근할 수 없으며, 작성한 댓글은 '탈퇴한 멤버'로 남습니다.`}
                          >
                            제거
                          </ConfirmButton>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">본인의 권한은 바꿀 수 없습니다. 다른 교수 계정을 만든 뒤 그 계정에서 변경하세요.</p>
      </section>

      <section aria-labelledby="code-title" className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 id="code-title" className="font-serif text-3xl mb-2">
            초대 코드 <span className="text-sm font-sans text-accent align-middle ml-1">추천</span>
          </h2>
          <p className="text-sm text-muted mb-8 leading-relaxed">
            코드를 만들어 학생에게 카카오톡·문자로 전달하세요. 학생은 가입 화면에서 코드와 이름, 이메일, 비밀번호를
            입력하면 바로 가입됩니다. (이메일 설정 없이 사용 가능)
          </p>
          <InviteCodeForm />
        </div>
        <div>
          <h3 className="eyebrow mb-3">만든 초대 코드</h3>
          {inviteCodes.length === 0 ? (
            <p className="text-sm text-muted">아직 만든 코드가 없습니다.</p>
          ) : (
            <ul className="border-t border-ink">
              {inviteCodes.map((c) => {
                const expired = isExpired(c.expires_at);
                const used = c.use_count >= c.max_uses;
                const link = `${base}/join?code=${c.code}`;
                return (
                  <li key={c.id} className="border-b border-line py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <code className={`font-mono text-lg tracking-[0.2em] ${expired || used ? "text-muted line-through" : ""}`}>
                        {c.code}
                      </code>
                      <Badge tone={c.role === "admin" ? "accent" : "line"}>{ROLE_LABEL[c.role]}</Badge>
                      {expired && <Badge>만료</Badge>}
                      {used && <Badge>사용 완료</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {c.use_count}/{c.max_uses}명 사용 · {c.expires_at ? `${formatDate(c.expires_at)}까지` : "기한 없음"}
                      {c.note && ` · ${c.note}`}
                    </p>
                    <div className="mt-1 -ml-2 flex flex-wrap">
                      {!expired && !used && <CopyButton text={`[연구 아카이브 초대]\n아래 주소에서 가입해 주세요.\n${link}\n초대 코드: ${c.code}`} label="초대 안내문 복사" />}
                      <form action={deleteInviteCode}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmButton message="이 초대 코드를 삭제할까요? 이미 가입한 멤버에게는 영향이 없습니다.">삭제</ConfirmButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {emailInviteEnabled && (
        <section aria-labelledby="email-title" className="max-w-2xl">
          <h2 id="email-title" className="font-serif text-3xl mb-2">
            이메일로 초대
          </h2>
          <p className="text-sm text-muted mb-8 leading-relaxed">
            입력한 주소로 초대 메일이 발송되고, 학생은 메일의 링크를 눌러 비밀번호를 정합니다. Supabase 의 이메일(SMTP)
            설정이 필요합니다 — 설정 가이드의 “선택 기능”을 참고하세요.
          </p>
          <InviteEmailForm />
        </section>
      )}
    </div>
  );
}
