import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { PasswordForm, ProfileForm } from "./forms";

export const metadata = { title: "내 정보 설정" };

export default async function SettingsPage() {
  const me = await requireUser();
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Settings" title="내 정보 설정" description={`${me.email} · ${ROLE_LABEL[me.role]}`} />
      <div className="grid gap-14 md:grid-cols-2">
        <section aria-labelledby="profile-title">
          <h2 id="profile-title" className="font-serif text-2xl mb-6">
            프로필 · 알림
          </h2>
          <ProfileForm name={me.display_name} emailNotify={me.email_notify} />
        </section>
        <section aria-labelledby="password-title">
          <h2 id="password-title" className="font-serif text-2xl mb-6">
            비밀번호
          </h2>
          <PasswordForm />
        </section>
      </div>
    </div>
  );
}
