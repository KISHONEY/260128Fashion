"use client";

// 값을 고르면 바로 폼을 제출하는 선택 상자 (필터용)
import type { ComponentProps } from "react";

export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
