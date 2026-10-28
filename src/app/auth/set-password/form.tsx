"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormMessage, inputCls } from "@/components/ui";
import { setPassword } from "./actions";

export function SetPasswordForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState(setPassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-6">
      <Field label="이름" htmlFor="name" required>
        <input id="name" name="name" required maxLength={40} defaultValue={defaultName} className={inputCls} />
      </Field>
      <Field label="새 비밀번호" htmlFor="password" required hint="8자 이상">
        <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className={inputCls} />
      </Field>
      <Field label="비밀번호 확인" htmlFor="password2" required>
        <input id="password2" name="password2" type="password" minLength={8} required autoComplete="new-password" className={inputCls} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">저장하고 시작하기</SubmitButton>
    </form>
  );
}
