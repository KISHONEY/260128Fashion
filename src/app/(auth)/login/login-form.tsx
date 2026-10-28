"use client";

import { SubmitButton } from "@/components/submit-button";
import { Field, FormMessage, inputCls } from "@/components/ui";
import { signIn } from "./actions";
import { useFormAction } from "@/lib/use-form-action";

export function LoginForm({ next }: { next: string }) {
  const [state, onSubmit, pending] = useFormAction(signIn);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7">
      <input type="hidden" name="next" value={next} />
      <Field label="이메일" htmlFor="email" required>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputCls} />
      </Field>
      <Field label="비밀번호" htmlFor="password" required>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputCls}
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="로그인 중…" className="w-full">
        로그인
      </SubmitButton>
    </form>
  );
}
