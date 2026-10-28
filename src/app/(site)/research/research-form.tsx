"use client";

// 연구 자료 작성/수정 폼 (교수 전용 화면)
import Link from "next/link";
import { useState } from "react";
import { FileDropzone } from "@/components/file-dropzone";
import { MarkdownEditor } from "@/components/markdown-editor";
import { SubmitButton } from "@/components/submit-button";
import { TagInput } from "@/components/tag-input";
import { Field, FormMessage, boxInputCls, btn, inputCls } from "@/components/ui";
import { STATUS_LABEL, STATUS_OPTIONS } from "@/lib/constants";
import type { AttachmentDraft, Category, Research } from "@/lib/types";
import { saveResearch } from "./actions";
import { useFormAction } from "@/lib/use-form-action";

export function ResearchForm({
  mode,
  id,
  research,
  categories,
  tags,
  allTags,
  attachments,
}: {
  mode: "new" | "edit";
  id: string;
  research?: Research;
  categories: Category[];
  tags: string[];
  allTags: string[];
  attachments: AttachmentDraft[];
}) {
  const [state, onSubmit, pending] = useFormAction(saveResearch);
  const [uploading, setUploading] = useState(false);

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="mode" value={mode} />

      <div className="flex flex-col gap-8 min-w-0">
        <Field label="제목" htmlFor="title" required>
          <input
            id="title"
            name="title"
            required
            maxLength={200}
            defaultValue={research?.title}
            className={`${inputCls} font-serif text-2xl md:text-3xl`}
            placeholder="연구 제목"
          />
        </Field>
        <Field label="요약" htmlFor="summary" hint="목록과 카드에 표시되는 짧은 소개 (500자 이내)">
          <textarea
            id="summary"
            name="summary"
            rows={3}
            maxLength={500}
            defaultValue={research?.summary}
            className={boxInputCls}
          />
        </Field>
        <Field label="이미지 · 첨부 파일" hint="첫 번째 이미지가 대표 이미지(썸네일)로 사용됩니다. ↑↓ 로 순서를 바꿀 수 있습니다.">
          <FileDropzone
            name="attachments"
            folder={`research/${id}`}
            initial={attachments}
            onBusyChange={setUploading}
          />
        </Field>
        <Field label="상세 설명" htmlFor="body" hint="마크다운 문법을 사용할 수 있습니다.">
          <MarkdownEditor id="body" name="body" defaultValue={research?.body} rows={16} maxLength={50000} />
        </Field>
      </div>

      <aside className="flex flex-col gap-7 lg:sticky lg:top-24 lg:self-start">
        <Field label="카테고리" htmlFor="category_id">
          <select id="category_id" name="category_id" defaultValue={research?.category_id ?? ""} className={boxInputCls}>
            <option value="">선택 안 함</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="연도" htmlFor="year">
          <input
            id="year"
            name="year"
            type="number"
            inputMode="numeric"
            min={1900}
            max={2200}
            defaultValue={research?.year ?? new Date().getFullYear()}
            className={boxInputCls}
          />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="eyebrow mb-2">상태</legend>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 border border-line px-3 py-2 cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper text-sm">
                <input
                  type="radio"
                  name="status"
                  value={s}
                  defaultChecked={(research?.status ?? "in_progress") === s}
                  className="sr-only"
                />
                {STATUS_LABEL[s]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="태그" htmlFor="tag-input">
          <TagInput id="tag-input" name="tags" initial={tags} suggestions={allTags} />
        </Field>

        <div className="flex flex-col gap-3 border-t border-ink pt-6">
          <FormMessage state={state} />
          <SubmitButton pending={pending} disabled={uploading} pendingText="저장 중…" className="w-full">
            {uploading ? "파일 업로드 중…" : mode === "new" ? "연구 자료 등록" : "수정 내용 저장"}
          </SubmitButton>
          <Link href={mode === "new" ? "/research" : `/research/${id}`} className={`${btn.ghost} w-full`}>
            취소
          </Link>
        </div>
      </aside>
    </form>
  );
}
