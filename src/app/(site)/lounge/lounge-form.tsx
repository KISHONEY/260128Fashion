"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormMessage, btn, inputCls } from "@/components/ui";
import type { LoungePost } from "@/lib/types";
import { saveLoungePost } from "./actions";

export function LoungeForm({ post }: { post?: LoungePost }) {
  const [state, action] = useActionState(saveLoungePost, undefined);
  return (
    <form action={action} className="flex flex-col gap-8 max-w-3xl">
      {post && <input type="hidden" name="id" value={post.id} />}
      <Field label="제목" htmlFor="title" required>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          defaultValue={post?.title}
          className={`${inputCls} font-serif text-2xl md:text-3xl`}
        />
      </Field>
      <Field label="본문" htmlFor="body" hint="마크다운 문법을 사용할 수 있습니다.">
        <MarkdownEditor id="body" name="body" defaultValue={post?.body} rows={14} maxLength={20000} />
      </Field>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton pendingText="저장 중…">{post ? "수정 내용 저장" : "글 올리기"}</SubmitButton>
        <Link href={post ? `/lounge/${post.id}` : "/lounge"} className={btn.ghost}>
          취소
        </Link>
      </div>
    </form>
  );
}
