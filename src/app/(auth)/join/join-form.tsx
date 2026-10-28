"use client";

import { SubmitButton } from "@/components/submit-button";
import { Field, FormMessage, inputCls } from "@/components/ui";
import { joinWithCode } from "./actions";
import { useFormAction } from "@/lib/use-form-action";

export function JoinForm({ code }: { code: string }) {
  const [state, onSubmit, pending] = useFormAction(joinWithCode);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Field label="초대 코드" htmlFor="code" required>
        <input
          id="code"
          name="code"
          defaultValue={code}
          required
          autoCapitalize="characters"
          className={`${inputCls} tracking-[0.2em] uppercase`}
        />
      </Field>
      <Field label="이름" htmlFor="name" required hint="다른 멤버에게 표시되는 이름입니다. (멘션에도 사용)">
        <input id="name" name="name" required maxLength={40} autoComplete="name" className={inputCls} />
      </Field>
      <Field label="이메일" htmlFor="email" required>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputCls} />
      </Field>
      <Field label="비밀번호" htmlFor="password" required hint="8자 이상">
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
      </Field>
      <Field label="비밀번호 확인" htmlFor="password2" required>
        <input
          id="password2"
          name="password2"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="가입 중…" className="w-full">
        가입하고 시작하기
      </SubmitButton>
      <p className="text-xs text-muted leading-relaxed">
        이 사이트는 이름과 이메일 외의 개인정보를 수집하지 않습니다.
      </p>
    </form>
  );
}
