"use client";

// 삭제처럼 되돌릴 수 없는 작업 전에 확인 창을 띄우는 제출 버튼
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { btn } from "./ui";

export function ConfirmButton({
  children,
  message = "정말 삭제하시겠습니까? 되돌릴 수 없습니다.",
  variant = "ghost",
  className = "",
}: {
  children: ReactNode;
  message?: string;
  variant?: keyof typeof btn;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${btn[variant]} ${className}`}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "처리 중…" : children}
    </button>
  );
}
