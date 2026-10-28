// 이메일 초대를 수락한 직후 보이는 화면: 이름과 비밀번호 설정
import { requireUser } from "@/lib/auth";
import { SetPasswordForm } from "./form";

export const metadata = { title: "비밀번호 설정" };

export default async function SetPasswordPage() {
  const user = await requireUser();
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="eyebrow mb-3">Welcome</p>
        <h1 className="font-serif text-4xl mb-3">환영합니다</h1>
        <p className="text-muted mb-10 leading-relaxed">
          {user.email} 계정으로 초대되었습니다. 사용할 이름과 비밀번호를 정해 주세요.
        </p>
        <SetPasswordForm defaultName={user.display_name} />
      </div>
    </main>
  );
}
