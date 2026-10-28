"use client";

// 태그 입력: 입력 후 Enter(또는 쉼표)로 추가, 기존 태그는 아래 목록에서 클릭해 추가
import { useState } from "react";
import { boxInputCls } from "./ui";

export function TagInput({
  name,
  initial = [],
  suggestions = [],
  id,
}: {
  name: string;
  initial?: string[];
  suggestions?: string[];
  id?: string;
}) {
  const [tags, setTags] = useState<string[]>(initial);
  const [text, setText] = useState("");

  function add(raw: string) {
    const t = raw.trim().replace(/^#/, "").slice(0, 30);
    if (t && !tags.includes(t) && tags.length < 20) setTags([...tags, t]);
    setText("");
  }

  const filtered = suggestions.filter((s) => !tags.includes(s) && (!text || s.includes(text.trim())));

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(tags)} />
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 border border-ink px-2.5 py-1 text-sm">
            #{t}
            <button
              type="button"
              onClick={() => setTags(tags.filter((x) => x !== t))}
              className="ml-1 text-muted hover:text-accent"
              aria-label={`${t} 태그 삭제`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        id={id}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) add(v.slice(0, -1));
          else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // 폼 제출 대신 태그 추가
            add(text);
          } else if (e.key === "Backspace" && !text && tags.length) {
            setTags(tags.slice(0, -1));
          }
        }}
        onBlur={() => text && add(text)}
        placeholder="태그 입력 후 Enter"
        className={boxInputCls}
      />
      {filtered.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="기존 태그">
          {filtered.slice(0, 20).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="text-xs text-muted border border-line px-2 py-0.5 hover:border-ink hover:text-ink"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
