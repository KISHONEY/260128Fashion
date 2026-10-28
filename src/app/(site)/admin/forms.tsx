"use client";

// 관리 화면에서 쓰는 입력 폼들
import { useActionState, useId, useState } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormMessage, boxInputCls, btn } from "@/components/ui";
import { ACCEPT_IMAGES, ROLE_LABEL } from "@/lib/constants";
import { fileUrl } from "@/lib/format";
import type { Category, SiteSettings, UserRole } from "@/lib/types";
import { uploadAttachment } from "@/lib/upload-client";
import {
  changeRole,
  createInviteCode,
  createTag,
  inviteByEmail,
  renameTag,
  saveCategory,
  saveSiteSettings,
} from "./actions";

// ---------------- 멤버 ----------------

export function RoleForm({ id, role, disabled }: { id: string; role: UserRole; disabled?: boolean }) {
  const [state, action] = useActionState(changeRole, undefined);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`role-${id}`}>
        권한
      </label>
      <select
        id={`role-${id}`}
        name="role"
        defaultValue={role}
        disabled={disabled}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`${boxInputCls} !py-1.5 !text-sm w-auto`}
      >
        {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      {state?.error && <span role="alert" className="text-xs text-accent">{state.error}</span>}
    </form>
  );
}

export function InviteCodeForm() {
  const [state, action] = useActionState(createInviteCode, undefined);
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <Field label="권한" htmlFor="code-role">
        <select id="code-role" name="role" defaultValue="member" className={boxInputCls}>
          <option value="member">{ROLE_LABEL.member}</option>
          <option value="admin">{ROLE_LABEL.admin}</option>
        </select>
      </Field>
      <Field label="사용 가능 인원" htmlFor="max_uses" hint="예: 신입생 5명이면 5">
        <input id="max_uses" name="max_uses" type="number" min={1} max={200} defaultValue={1} className={boxInputCls} />
      </Field>
      <Field label="유효 기간(일)" htmlFor="days" hint="0 이면 기한 없음">
        <input id="days" name="days" type="number" min={0} max={365} defaultValue={7} className={boxInputCls} />
      </Field>
      <Field label="메모 (선택)" htmlFor="note">
        <input id="note" name="note" maxLength={100} placeholder="예: 2026 신입 석사" className={boxInputCls} />
      </Field>
      <div className="sm:col-span-2 flex flex-col gap-3">
        <FormMessage state={state} />
        <SubmitButton className="self-start">초대 코드 만들기</SubmitButton>
      </div>
    </form>
  );
}

export function InviteEmailForm() {
  const [state, action] = useActionState(inviteByEmail, undefined);
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <Field label="이메일" htmlFor="invite-email" required>
        <input id="invite-email" name="email" type="email" required className={boxInputCls} />
      </Field>
      <Field label="이름 (선택)" htmlFor="invite-name">
        <input id="invite-name" name="name" maxLength={40} className={boxInputCls} />
      </Field>
      <Field label="권한" htmlFor="invite-role">
        <select id="invite-role" name="role" defaultValue="member" className={boxInputCls}>
          <option value="member">{ROLE_LABEL.member}</option>
          <option value="admin">{ROLE_LABEL.admin}</option>
        </select>
      </Field>
      <div className="sm:col-span-2 flex flex-col gap-3">
        <FormMessage state={state} />
        <SubmitButton className="self-start" variant="secondary" pendingText="보내는 중…">
          초대 메일 보내기
        </SubmitButton>
      </div>
    </form>
  );
}

// 초대 링크 복사 버튼
export function CopyButton({ text, label = "링크 복사" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={btn.ghost}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("아래 내용을 복사하세요", text);
        }
      }}
    >
      <span aria-live="polite">{copied ? "복사됨 ✓" : label}</span>
    </button>
  );
}

// ---------------- 카테고리 · 태그 ----------------

export function CategoryForm({ category }: { category?: Category }) {
  const [state, action] = useActionState(saveCategory, undefined);
  const uid = useId();
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {category && <input type="hidden" name="id" value={category.id} />}
      <label className="sr-only" htmlFor={`${uid}-name`}>
        카테고리 이름
      </label>
      <input
        id={`${uid}-name`}
        name="name"
        required
        maxLength={40}
        defaultValue={category?.name}
        placeholder="새 카테고리 이름"
        className={`${boxInputCls} !w-auto flex-1 min-w-40`}
      />
      <label className="sr-only" htmlFor={`${uid}-order`}>
        표시 순서
      </label>
      <input
        id={`${uid}-order`}
        name="sort_order"
        type="number"
        defaultValue={category?.sort_order ?? 0}
        title="표시 순서 (작을수록 앞)"
        className={`${boxInputCls} !w-20`}
      />
      <SubmitButton variant={category ? "small" : "primary"} className={category ? "" : "h-11"}>
        {category ? "저장" : "추가"}
      </SubmitButton>
      {(state?.error || state?.success) && (
        <span role="status" className={`w-full text-xs ${state.error ? "text-accent" : "text-muted"}`}>
          {state.error ?? state.success}
        </span>
      )}
    </form>
  );
}

export function TagForm({ tag }: { tag?: { id: string; name: string } }) {
  const [state, action] = useActionState(tag ? renameTag : createTag, undefined);
  const uid = useId();
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {tag && <input type="hidden" name="id" value={tag.id} />}
      <label className="sr-only" htmlFor={`${uid}-tag`}>
        태그 이름
      </label>
      <input
        id={`${uid}-tag`}
        name="name"
        required
        maxLength={30}
        defaultValue={tag?.name}
        placeholder="새 태그"
        className={`${boxInputCls} !w-auto flex-1 min-w-32`}
      />
      <SubmitButton variant={tag ? "small" : "primary"} className={tag ? "" : "h-11"}>
        {tag ? "저장" : "추가"}
      </SubmitButton>
      {(state?.error || state?.success) && (
        <span role="status" className={`w-full text-xs ${state.error ? "text-accent" : "text-muted"}`}>
          {state.error ?? state.success}
        </span>
      )}
    </form>
  );
}

// ---------------- 교수 소개 ----------------

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action] = useActionState(saveSiteSettings, undefined);
  const [photo, setPhoto] = useState(settings.photo_path ?? "");
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileId = useId();

  async function onPhoto(file: File) {
    setPhotoError("");
    setUploading(true);
    try {
      const draft = await uploadAttachment(file, "site", { imagesOnly: true, noThumb: true });
      setPhoto(draft.storage_path ?? "");
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "업로드 실패");
    }
    setUploading(false);
  }

  return (
    <form action={action} className="grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-14">
      <input type="hidden" name="photo_path" value={photo} />
      <div className="flex flex-col gap-3">
        <p className="eyebrow">사진</p>
        <div className="aspect-[4/5] bg-paper-deep overflow-hidden flex items-center justify-center">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl(photo)} alt="교수 사진 미리보기" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-muted">사진 없음</span>
          )}
        </div>
        <label htmlFor={fileId} className={`${btn.small} cursor-pointer`}>
          {uploading ? "올리는 중…" : photo ? "사진 바꾸기" : "사진 올리기"}
        </label>
        <input
          id={fileId}
          type="file"
          accept={ACCEPT_IMAGES}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPhoto(f);
            e.target.value = "";
          }}
        />
        {photo && (
          <button type="button" onClick={() => setPhoto("")} className={btn.ghost}>
            사진 빼기
          </button>
        )}
        {photoError && <p className="text-sm text-accent">{photoError}</p>}
      </div>

      <div className="flex flex-col gap-7">
        <div className="grid gap-7 sm:grid-cols-2">
          <Field label="이름" htmlFor="s-name">
            <input id="s-name" name="name" defaultValue={settings.name} maxLength={60} className={boxInputCls} />
          </Field>
          <Field label="직함 · 소속" htmlFor="s-title">
            <input
              id="s-title"
              name="title"
              defaultValue={settings.title}
              maxLength={200}
              placeholder="○○대학교 패션디자인학과 교수"
              className={boxInputCls}
            />
          </Field>
        </div>
        <Field label="연구 분야" htmlFor="s-areas" hint="쉼표(,) 또는 줄바꿈으로 구분합니다.">
          <textarea
            id="s-areas"
            name="research_areas"
            rows={2}
            defaultValue={settings.research_areas.join(", ")}
            placeholder="지속가능 패션, 업사이클링, 패션 문화사"
            className={boxInputCls}
          />
        </Field>
        <Field label="소개" htmlFor="s-bio" hint="마크다운 문법을 사용할 수 있습니다.">
          <MarkdownEditor id="s-bio" name="bio" defaultValue={settings.bio} rows={8} maxLength={5000} />
        </Field>
        <div className="grid gap-7 sm:grid-cols-2">
          <Field label="연락처 이메일" htmlFor="s-email">
            <input id="s-email" name="email" type="email" defaultValue={settings.email} className={boxInputCls} />
          </Field>
          <Field label="연구실 위치" htmlFor="s-office">
            <input id="s-office" name="office" defaultValue={settings.office} placeholder="예: 예술관 512호" className={boxInputCls} />
          </Field>
        </div>
        <FormMessage state={state} />
        <SubmitButton disabled={uploading} className="self-start">
          저장
        </SubmitButton>
      </div>
    </form>
  );
}
