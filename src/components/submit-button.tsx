"use client";

// 폼 제출 버튼 — 제출 중에는 "처리 중…" 으로 바뀌고 중복 클릭을 막습니다.
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { btn } from "./ui";

export function SubmitButton({
  children,
  pendingText = "처리 중…",
  variant = "primary",
  className = "",
  disabled,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: keyof typeof btn;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${btn[variant]} ${className}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
