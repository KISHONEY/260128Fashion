"use client";

// 댓글 입력 폼
// - @를 입력하면 멤버 목록이 떠서 멘션할 사람을 고를 수 있음 (↑↓ 선택, Enter 확정)
// - 이미지 첨부 (자동 리사이즈)
// - 마크다운 지원
import { useActionState, useId, useRef, useState } from "react";
import { createComment } from "@/app/(site)/_actions/comments";
import { ACCEPT_IMAGES, MAX_COMMENT_IMAGES } from "@/lib/constants";
import { fileUrl } from "@/lib/format";
import type { ActionState, AttachmentDraft, CommentTarget } from "@/lib/types";
import { uploadAttachment } from "@/lib/upload-client";
import { SubmitButton } from "../submit-button";
import { FormMessage, boxInputCls, btn } from "../ui";
import type { Member } from "./types";

export function CommentForm({
  target,
  parentId,
  members,
  meId,
  autoFocus,
  onDone,
  placeholder = "의견을 남겨 주세요. @이름 으로 멤버를 호출할 수 있습니다.",
}: {
  target: CommentTarget;
  parentId?: string;
  members: Member[];
  meId: string;
  autoFocus?: boolean;
  onDone?: () => void;
  placeholder?: string;
}) {
  // 등록에 성공하면 입력칸을 비움
  const [state, action] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createComment(prev, formData);
    if (result?.success) {
      setBody("");
      setMentioned([]);
      setImages([]);
      onDone?.();
    }
    return result;
  }, undefined);
  const [body, setBody] = useState("");
  const [mentioned, setMentioned] = useState<Member[]>([]);
  const [images, setImages] = useState<AttachmentDraft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const listId = useId();
  const fileId = useId();

  const candidates =
    query === null
      ? []
      : members
          .filter((m) => m.id !== meId && m.display_name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6);

  // 커서 앞의 "@검색어" 찾기
  function detectMention(value: string, caret: number) {
    const before = value.slice(0, caret);
    const match = /(^|\s)@([^\s@]{0,20})$/.exec(before);
    setQuery(match ? match[2] : null);
    setActiveIndex(0);
  }

  function pick(m: Member) {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = body.slice(0, caret).replace(/@([^\s@]{0,20})$/, `@${m.display_name} `);
    const next = before + body.slice(caret);
    setBody(next);
    setMentioned((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  }

  async function onImages(files: FileList) {
    setUploadError("");
    const list = Array.from(files).slice(0, MAX_COMMENT_IMAGES - images.length);
    if (!list.length) {
      setUploadError(`이미지는 최대 ${MAX_COMMENT_IMAGES}장까지 첨부할 수 있습니다.`);
      return;
    }
    setUploading(true);
    for (const f of list) {
      try {
        const draft = await uploadAttachment(f, `comments/${meId}`, { imagesOnly: true, noThumb: true });
        setImages((prev) => [...prev, draft]);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "업로드 실패");
      }
    }
    setUploading(false);
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="target_type" value={target.type} />
      <input type="hidden" name="target_id" value={target.id} />
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}
      <input
        type="hidden"
        name="mentions"
        value={JSON.stringify(mentioned.filter((m) => body.includes(`@${m.display_name}`)).map((m) => m.id))}
      />
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="relative">
        <label htmlFor={`${listId}-body`} className="sr-only">
          {parentId ? "답글 내용" : "댓글 내용"}
        </label>
        <textarea
          ref={textareaRef}
          id={`${listId}-body`}
          name="body"
          value={body}
          rows={parentId ? 2 : 3}
          maxLength={5000}
          autoFocus={autoFocus}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={candidates.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={candidates.length ? `${listId}-${activeIndex}` : undefined}
          onChange={(e) => {
            setBody(e.target.value);
            detectMention(e.target.value, e.target.selectionStart);
          }}
          onKeyDown={(e) => {
            if (candidates.length) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % candidates.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => (i - 1 + candidates.length) % candidates.length);
              } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                pick(candidates[activeIndex]);
              } else if (e.key === "Escape") {
                setQuery(null);
              }
            } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              formRef.current?.requestSubmit(); // Ctrl/⌘ + Enter 로 등록
            }
          }}
          onBlur={() => setTimeout(() => setQuery(null), 150)}
          className={`${boxInputCls} leading-relaxed`}
        />
        {candidates.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            aria-label="멘션할 멤버"
            className="absolute z-20 left-0 mt-1 w-64 max-w-full bg-paper border border-ink shadow-[4px_4px_0_0_var(--ink)]"
          >
            {candidates.map((m, i) => (
              <li
                key={m.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(m);
                }}
                className={`px-3 py-2 text-sm cursor-pointer ${i === activeIndex ? "bg-ink text-paper" : ""}`}
              >
                @{m.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {images.map((img) => (
            <li key={img.storage_path} className="relative h-20 w-20 bg-paper-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(img.storage_path)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((p) => p.storage_path !== img.storage_path))}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-ink text-paper text-xs"
                aria-label={`${img.file_name} 첨부 취소`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <label htmlFor={fileId} className={`${btn.ghost} cursor-pointer px-0`}>
            {uploading ? "이미지 올리는 중…" : "+ 이미지"}
          </label>
          <input
            id={fileId}
            type="file"
            accept={ACCEPT_IMAGES}
            multiple
            className="sr-only"
            disabled={uploading || images.length >= MAX_COMMENT_IMAGES}
            onChange={(e) => {
              if (e.target.files) onImages(e.target.files);
              e.target.value = "";
            }}
          />
          <span className="text-xs text-muted hidden sm:inline">마크다운 지원 · Ctrl+Enter 등록</span>
        </div>
        <div className="flex items-center gap-2">
          {onDone && (
            <button type="button" onClick={onDone} className={btn.ghost}>
              취소
            </button>
          )}
          <SubmitButton disabled={uploading || !body.trim()} pendingText="등록 중…" className="h-10 px-4">
            {parentId ? "답글 등록" : "댓글 등록"}
          </SubmitButton>
        </div>
      </div>
      {uploadError && <p className="text-sm text-accent">{uploadError}</p>}
      {state?.error && <FormMessage state={state} />}
    </form>
  );
}
