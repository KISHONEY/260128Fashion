"use client";

// 드래그앤드롭 파일 업로드 상자
// - 파일을 끌어다 놓거나 [파일 선택]으로 고르면 바로 Storage 에 업로드합니다.
// - 이미지는 자동으로 리사이즈 + 썸네일 생성
// - 순서 바꾸기(첫 번째 이미지가 대표 이미지), 삭제, (선택) 외부 링크 추가
// - 결과는 숨은 입력칸(name)에 JSON 으로 담겨 폼과 함께 서버로 전송됩니다.
import { useId, useRef, useState } from "react";
import { ACCEPT_ATTR, ACCEPT_IMAGES, KIND_LABEL } from "@/lib/constants";
import { fileUrl, formatBytes } from "@/lib/format";
import type { AttachmentDraft } from "@/lib/types";
import { uploadAttachment } from "@/lib/upload-client";
import { boxInputCls, btn } from "./ui";

type Item = AttachmentDraft & { key: string; status: "done" | "uploading" | "error"; message?: string };

export function FileDropzone({
  name,
  folder,
  initial = [],
  allowLinks = false,
  imagesOnly = false,
  onBusyChange,
}: {
  name: string;
  folder: string;
  initial?: AttachmentDraft[];
  allowLinks?: boolean;
  imagesOnly?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [items, setItems] = useState<Item[]>(() =>
    initial.map((a) => ({ ...a, key: a.id ?? crypto.randomUUID(), status: "done" as const })),
  );
  const [dragging, setDragging] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkError, setLinkError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const busyCount = useRef(0);

  function setBusy(delta: number) {
    busyCount.current += delta;
    onBusyChange?.(busyCount.current > 0);
  }

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    const pending: Item[] = files.map((f) => ({
      key: crypto.randomUUID(),
      kind: "document",
      storage_path: null,
      thumb_path: null,
      url: null,
      file_name: f.name,
      mime_type: null,
      size_bytes: f.size,
      width: null,
      height: null,
      status: "uploading",
    }));
    setItems((prev) => [...prev, ...pending]);
    setBusy(1);
    // 한 번에 하나씩 순서대로 업로드 (휴대폰에서도 안정적으로)
    for (const [i, file] of files.entries()) {
      const key = pending[i].key;
      try {
        const draft = await uploadAttachment(file, folder, { imagesOnly });
        setItems((prev) => prev.map((it) => (it.key === key ? { ...draft, key, status: "done" } : it)));
      } catch (e) {
        const message = e instanceof Error ? e.message : "업로드 실패";
        setItems((prev) => prev.map((it) => (it.key === key ? { ...it, status: "error", message } : it)));
      }
    }
    setBusy(-1);
  }

  function move(key: string, dir: -1 | 1) {
    setItems((prev) => {
      const i = prev.findIndex((it) => it.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function remove(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setLinkError("http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        kind: "link",
        storage_path: null,
        thumb_path: null,
        url,
        file_name: linkTitle.trim() || url,
        mime_type: null,
        size_bytes: null,
        width: null,
        height: null,
        status: "done",
      },
    ]);
    setLinkUrl("");
    setLinkTitle("");
    setLinkError("");
  }

  // 서버로 보낼 값: 업로드가 끝난 항목만, 화면 순서대로
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = JSON.stringify(items.filter((it) => it.status === "done").map(({ key, status, message, ...rest }) => rest));

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name={name} value={value} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-ink/40 bg-white/40"
        }`}
      >
        <p className="font-serif text-xl">파일을 여기에 끌어다 놓으세요</p>
        <p className="mt-2 text-sm text-muted">
          {imagesOnly
            ? "이미지(JPG, PNG, WEBP, GIF)"
            : "이미지, PDF, PPT, 워드, 엑셀, 한글(HWP) 파일 · 최대 50MB"}
          {" · "}이미지는 자동으로 크기가 조정됩니다
        </p>
        <label htmlFor={inputId} className={`${btn.secondary} mt-5 cursor-pointer`}>
          파일 선택
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={imagesOnly ? ACCEPT_IMAGES : ACCEPT_ATTR}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {allowLinks && (
        <div className="border border-line p-4 flex flex-col gap-3">
          <p className="eyebrow">외부 링크 추가</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
              aria-label="링크 주소"
              className={boxInputCls}
            />
            <input
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="표시할 이름 (선택)"
              aria-label="링크 이름"
              className={boxInputCls}
            />
            <button type="button" onClick={addLink} className={btn.small + " h-auto py-2.5"}>
              추가
            </button>
          </div>
          {linkError && <p className="text-sm text-accent">{linkError}</p>}
        </div>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-line border-y border-line" aria-live="polite">
          {items.map((it, index) => (
            <li key={it.key} className="flex items-center gap-3 py-3">
              <div className="h-16 w-14 shrink-0 bg-paper-deep flex items-center justify-center overflow-hidden">
                {it.kind === "image" && it.status === "done" && it.storage_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl(it.thumb_path ?? it.storage_path)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[0.65rem] tracking-wider text-muted">
                    {it.status === "uploading" ? "…" : KIND_LABEL[it.kind]}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{it.file_name}</p>
                <p className="text-xs text-muted">
                  {it.status === "uploading" && "업로드 중…"}
                  {it.status === "error" && <span className="text-accent">{it.message}</span>}
                  {it.status === "done" &&
                    (it.kind === "link" ? it.url : `${KIND_LABEL[it.kind]} · ${formatBytes(it.size_bytes)}`)}
                  {it.status === "done" && index === items.findIndex((x) => x.kind === "image") && it.kind === "image" && (
                    <span className="ml-2 text-accent">대표 이미지</span>
                  )}
                </p>
              </div>
              <div className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => move(it.key, -1)}
                  disabled={index === 0}
                  className={btn.ghost}
                  aria-label={`${it.file_name} 위로 이동`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(it.key, 1)}
                  disabled={index === items.length - 1}
                  className={btn.ghost}
                  aria-label={`${it.file_name} 아래로 이동`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(it.key)}
                  disabled={it.status === "uploading"}
                  className={btn.ghost}
                  aria-label={`${it.file_name} 삭제`}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
