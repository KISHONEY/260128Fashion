"use client";

// 서버 액션 폼 도우미
// React 19 는 <form action={...}> 제출이 끝나면 입력칸을 자동으로 비웁니다.
// 오류가 나도 내용이 사라지면 (예: 긴 연구 설명) 다시 써야 하므로,
// onSubmit 으로 직접 제출해 입력 내용을 그대로 유지합니다.
import { startTransition, useActionState, type FormEvent } from "react";
import type { ActionState } from "./types";

export function useFormAction(fn: (prev: ActionState, formData: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(fn, undefined);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };
  return [state, onSubmit, pending] as const;
}
