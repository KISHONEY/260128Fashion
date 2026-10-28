"use client";

// 마크다운 입력칸 + 미리보기 탭
import { useId, useState } from "react";
import { Markdown } from "./markdown";
import { boxInputCls } from "./ui";

export function MarkdownEditor({
  name,
  defaultValue = "",
  rows = 12,
  maxLength,
  placeholder,
  id,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  id?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <div>
      <div role="tablist" aria-label="편집 모드" className="flex gap-4 text-sm mb-2">
        <button
          type="button"
          role="tab"
          aria-selected={!preview}
          onClick={() => setPreview(false)}
          className={!preview ? "text-ink underline underline-offset-4" : "text-muted"}
        >
          작성
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={preview}
          onClick={() => setPreview(true)}
          className={preview ? "text-ink underline underline-offset-4" : "text-muted"}
        >
          미리보기
        </button>
        <span className="ml-auto text-xs text-muted hidden sm:inline">
          **굵게**, *기울임*, # 제목, - 목록, [링크](주소)
        </span>
      </div>
      {/* 미리보기 중에도 값이 폼과 함께 전송되도록 textarea 는 숨기기만 함 */}
      <textarea
        id={fieldId}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        hidden={preview}
        className={`${boxInputCls} leading-relaxed font-[inherit]`}
      />
      {preview && (
        <div className="border border-line bg-white/60 px-4 py-3 min-h-40">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-muted text-sm">내용이 없습니다.</p>}
        </div>
      )}
    </div>
  );
}
