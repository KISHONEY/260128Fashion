"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormMessage, inputCls } from "@/components/ui";
import { changePassword, updateProfile } from "./actions";

export function ProfileForm({ name, emailNotify }: { name: string; emailNotify: boolean }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="flex flex-col gap-6">
      <Field label="이름" htmlFor="display_name" required hint="멘션(@이름)에 사용됩니다.">
        <input id="display_name" name="display_name" required maxLength={40} defaultValue={name} className={inputCls} />
      </Field>
      <label className="flex items-start gap-3 text-sm cursor-pointer">
        <input type="checkbox" name="email_notify" defaultChecked={emailNotify} className="mt-1 accent-[var(--accent)] h-4 w-4" />
        <span>
          누군가 나를 @멘션하면 이메일로도 알려 주세요.
          <span className="block text-xs text-muted">사이트 관리자가 이메일 발송을 설정한 경우에만 동작합니다.</span>
        </span>
      </label>
      <FormMessage state={state} />
      <SubmitButton className="self-start">저장</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-6">
      <Field label="새 비밀번호" htmlFor="password" required hint="8자 이상">
        <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className={inputCls} />
      </Field>
      <Field label="새 비밀번호 확인" htmlFor="password2" required>
        <input id="password2" name="password2" type="password" minLength={8} required autoComplete="new-password" className={inputCls} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="self-start" variant="secondary">
        비밀번호 변경
      </SubmitButton>
    </form>
  );
}
