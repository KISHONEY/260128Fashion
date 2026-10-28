"use client";

// 수업 자료 작성/수정 폼 (교수 전용)
import Link from "next/link";
import { useState } from "react";
import { FileDropzone } from "@/components/file-dropzone";
import { MarkdownEditor } from "@/components/markdown-editor";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormMessage, boxInputCls, btn, inputCls } from "@/components/ui";
import { AUDIENCE_LABEL } from "@/lib/constants";
import type { AttachmentDraft, CourseAudience, CourseMaterial } from "@/lib/types";
import { saveCourseMaterial } from "./actions";
import { useFormAction } from "@/lib/use-form-action";

export function CourseForm({
  mode,
  id,
  material,
  semesters,
  courseNames,
  defaults,
  attachments,
}: {
  mode: "new" | "edit";
  id: string;
  material?: CourseMaterial;
  semesters: string[];
  courseNames: string[];
  defaults?: { semester?: string; course?: string };
  attachments: AttachmentDraft[];
}) {
  const [state, onSubmit, pending] = useFormAction(saveCourseMaterial);
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
            defaultValue={material?.title}
            placeholder="예: 3주차 — 실루엣의 역사"
            className={`${inputCls} font-serif text-2xl md:text-3xl`}
          />
        </Field>
        <Field label="설명" htmlFor="description" hint="마크다운 문법을 사용할 수 있습니다.">
          <MarkdownEditor id="description" name="description" defaultValue={material?.description} rows={10} maxLength={20000} />
        </Field>
        <Field label="첨부 파일 · 링크" hint="PDF, PPT, 이미지, 문서 파일을 올리거나 외부 링크(유튜브, 구글 드라이브 등)를 추가하세요.">
          <FileDropzone
            name="attachments"
            folder={`courses/${id}`}
            initial={attachments}
            allowLinks
            onBusyChange={setUploading}
          />
        </Field>
      </div>

      <aside className="flex flex-col gap-7 lg:sticky lg:top-24 lg:self-start">
        <Field label="학기" htmlFor="semester" required hint="예: 2026-1, 2026-2, 2026-여름">
          <input
            id="semester"
            name="semester"
            required
            maxLength={20}
            list="semester-list"
            defaultValue={material?.semester ?? defaults?.semester}
            className={boxInputCls}
          />
          <datalist id="semester-list">
            {semesters.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="과목명" htmlFor="course_name" required>
          <input
            id="course_name"
            name="course_name"
            required
            maxLength={100}
            list="course-list"
            defaultValue={material?.course_name ?? defaults?.course}
            className={boxInputCls}
          />
          <datalist id="course-list">
            {courseNames.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="주차" htmlFor="week" hint="0 으로 두면 '공통 자료'로 표시됩니다.">
          <input
            id="week"
            name="week"
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            defaultValue={material?.week ?? 1}
            className={boxInputCls}
          />
        </Field>
        <fieldset>
          <legend className="eyebrow mb-2">공개 대상</legend>
          <div className="flex flex-col gap-2">
            {(Object.keys(AUDIENCE_LABEL) as CourseAudience[]).map((a) => (
              <label
                key={a}
                className="flex items-center gap-2 border border-line px-3 py-2.5 cursor-pointer text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper"
              >
                <input
                  type="radio"
                  name="audience"
                  value={a}
                  defaultChecked={(material?.audience ?? "members") === a}
                  className="sr-only"
                />
                {AUDIENCE_LABEL[a]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 border-t border-ink pt-6">
          <FormMessage state={state} />
          <SubmitButton pending={pending} disabled={uploading} pendingText="저장 중…" className="w-full">
            {uploading ? "파일 업로드 중…" : mode === "new" ? "수업 자료 등록" : "수정 내용 저장"}
          </SubmitButton>
          <Link href={mode === "new" ? "/courses" : `/courses/${id}`} className={`${btn.ghost} w-full`}>
            취소
          </Link>
        </div>
      </aside>
    </form>
  );
}
