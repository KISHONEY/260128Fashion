"use client";

// 댓글 하나 (작성자, 시간, 본문, 이미지, 답글/수정/삭제/고정 버튼)
import { useState } from "react";
import { deleteComment, togglePin, updateComment } from "@/app/(site)/_actions/comments";
import { fileUrl, formatDateTime, timeAgo } from "@/lib/format";
import { useFormAction } from "@/lib/use-form-action";
import type { ActionState, CommentTarget } from "@/lib/types";
import { ConfirmButton } from "../confirm-button";
import { Markdown } from "../markdown";
import { SubmitButton } from "../submit-button";
import { FormMessage, boxInputCls, btn } from "../ui";
import { CommentForm } from "./comment-form";
import type { CommentView, Member } from "./types";

export function CommentItem({
  comment,
  replies = [],
  target,
  path,
  me,
  members,
}: {
  comment: CommentView;
  replies?: CommentView[];
  target: CommentTarget;
  path: string;
  me: { id: string; role: "admin" | "member" };
  members: Member[];
}) {
  const [replying, setReplying] = useState(false);
  const isReply = Boolean(comment.parent_id);

  return (
    <li id={`comment-${comment.id}`} className={`scroll-mt-24 ${isReply ? "" : "py-7 border-b border-line"}`}>
      <CommentBody comment={comment} path={path} me={me} onReply={isReply ? undefined : () => setReplying((v) => !v)} />

      {(replies.length > 0 || replying) && (
        <ul className="mt-5 ml-4 md:ml-12 pl-4 md:pl-6 border-l border-line flex flex-col gap-6">
          {replies.map((r) => (
            <CommentItem key={r.id} comment={r} target={target} path={path} me={me} members={members} />
          ))}
          {replying && (
            <li>
              <CommentForm
                target={target}
                parentId={comment.id}
                members={members}
                meId={me.id}
                autoFocus
                onDone={() => setReplying(false)}
                placeholder={`${comment.author?.display_name ?? ""}님에게 답글`}
              />
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

function CommentBody({
  comment,
  path,
  me,
  onReply,
}: {
  comment: CommentView;
  path: string;
  me: { id: string; role: "admin" | "member" };
  onReply?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [state, onSubmit, pending] = useFormAction(async (prev: ActionState, fd: FormData) => {
    const r = await updateComment(prev, fd);
    if (r?.success) setEditing(false);
    return r;
  });

  const isMine = comment.author?.id === me.id;
  const isAdmin = me.role === "admin";
  const name = comment.author?.display_name ?? "탈퇴한 멤버";

  return (
    <article aria-label={`${name}의 댓글`}>
      <header className="flex items-center gap-3 flex-wrap">
        <span
          aria-hidden
          className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center font-serif text-sm ${
            comment.author?.role === "admin" ? "bg-ink text-paper" : "border border-ink"
          }`}
        >
          {name.slice(0, 1)}
        </span>
        <span className="text-sm font-semibold">{name}</span>
        {comment.author?.role === "admin" && <span className="text-[0.68rem] tracking-wider text-accent">교수</span>}
        <time dateTime={comment.created_at} title={formatDateTime(comment.created_at)} className="text-xs text-muted">
          {timeAgo(comment.created_at)}
          {comment.edited && " · 수정됨"}
        </time>
        {comment.is_pinned && (
          <span className="text-[0.68rem] tracking-wider border border-accent text-accent px-1.5">고정됨</span>
        )}
      </header>

      <div className="mt-3 md:pl-11">
        {editing ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={comment.id} />
            <input type="hidden" name="path" value={path} />
            <label htmlFor={`edit-${comment.id}`} className="sr-only">
              댓글 수정
            </label>
            <textarea
              id={`edit-${comment.id}`}
              name="body"
              defaultValue={comment.body}
              rows={3}
              maxLength={5000}
              className={boxInputCls}
              autoFocus
            />
            <FormMessage state={state} />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(false)} className={btn.ghost}>
                취소
              </button>
              <SubmitButton pending={pending} className="h-9 px-4">저장</SubmitButton>
            </div>
          </form>
        ) : (
          <Markdown compact mentions={comment.mentions}>
            {comment.body}
          </Markdown>
        )}

        {comment.images.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {comment.images.map((img) => (
              <li key={img.id}>
                <a href={fileUrl(img.storage_path)} target="_blank" rel="noopener noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl(img.storage_path)}
                    alt={img.file_name}
                    loading="lazy"
                    className="h-32 md:h-40 w-auto max-w-full object-cover bg-paper-deep"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}

        {!editing && (
          <div className="mt-2 -ml-2 flex flex-wrap items-center">
            {onReply && (
              <button type="button" onClick={onReply} className={btn.ghost}>
                답글
              </button>
            )}
            {isMine && (
              <button type="button" onClick={() => setEditing(true)} className={btn.ghost}>
                수정
              </button>
            )}
            {isAdmin && !comment.parent_id && (
              <form action={togglePin}>
                <input type="hidden" name="id" value={comment.id} />
                <input type="hidden" name="path" value={path} />
                <input type="hidden" name="pinned" value={String(comment.is_pinned)} />
                <button className={btn.ghost}>{comment.is_pinned ? "고정 해제" : "고정"}</button>
              </form>
            )}
            {(isMine || isAdmin) && (
              <form action={deleteComment}>
                <input type="hidden" name="id" value={comment.id} />
                <input type="hidden" name="path" value={path} />
                <ConfirmButton message="이 댓글을 삭제할까요? 답글도 함께 삭제됩니다.">삭제</ConfirmButton>
              </form>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
