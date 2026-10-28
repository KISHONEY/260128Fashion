import Link from "next/link";
import { btn } from "@/components/ui";

export const metadata = { title: "링크 오류" };

export default function AuthErrorPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-3">Link expired</p>
        <h1 className="font-serif text-4xl mb-5">링크가 만료되었거나 올바르지 않습니다</h1>
        <p className="text-muted leading-relaxed mb-8">
          초대 링크는 한 번만 사용할 수 있고, 일정 시간이 지나면 만료됩니다. 교수님께 초대를 다시
          요청해 주세요.
        </p>
        <Link href="/login" className={btn.primary}>
          로그인 화면으로
        </Link>
      </div>
    </main>
  );
}
