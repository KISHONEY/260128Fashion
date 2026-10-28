// 로그인은 되어 있지만 멤버 목록에 없는 계정(교수가 제거한 멤버)에게 보이는 화면
import { btn } from "@/components/ui";

export const metadata = { title: "접근 권한 없음" };

export default function NoAccessPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-3">No access</p>
        <h1 className="font-serif text-4xl mb-5">접근 권한이 없습니다</h1>
        <p className="text-muted leading-relaxed mb-8">
          이 계정은 연구실 멤버 목록에 없습니다. 다시 이용하려면 교수님께 문의해 주세요.
        </p>
        <form action="/auth/signout" method="post">
          <button className={btn.primary}>로그아웃</button>
        </form>
      </div>
    </main>
  );
}
