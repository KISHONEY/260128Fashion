import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <>
      <p className="eyebrow mb-3">Sign in</p>
      <h2 className="font-serif text-4xl mb-10">로그인</h2>
      <LoginForm next={typeof next === "string" ? next : "/"} />
      <div className="mt-10 border-t border-line pt-6 text-sm text-muted leading-relaxed">
        <p>
          초대 코드를 받으셨나요?{" "}
          <Link href="/join" className="text-ink underline underline-offset-4 hover:text-accent">
            초대 코드로 가입하기
          </Link>
        </p>
        <p className="mt-2">비밀번호를 잊으셨다면 교수님께 문의해 주세요.</p>
      </div>
    </>
  );
}
