import type { Metadata } from "next";
import Link from "next/link";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "초대 코드로 가입" };

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const { code } = await searchParams;
  return (
    <>
      <p className="eyebrow mb-3">Join by invitation</p>
      <h2 className="font-serif text-4xl mb-10">초대 코드로 가입</h2>
      <JoinForm code={typeof code === "string" ? code : ""} />
      <p className="mt-8 border-t border-line pt-6 text-sm text-muted">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4 hover:text-accent">
          로그인
        </Link>
      </p>
    </>
  );
}
