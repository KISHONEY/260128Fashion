// PDF·문서·링크 첨부 목록
import { KIND_LABEL } from "@/lib/constants";
import { fileUrl, formatBytes } from "@/lib/format";
import type { Attachment } from "@/lib/types";

function extOf(name: string) {
  return name.split(".").pop()?.toUpperCase().slice(0, 4) ?? "";
}

export function AttachmentList({ items }: { items: Attachment[] }) {
  if (!items.length) return null;
  return (
    <ul className="border-t border-ink">
      {items.map((a) => {
        const isLink = a.kind === "link";
        const href = isLink ? a.url! : fileUrl(a.storage_path);
        return (
          <li key={a.id} className="border-b border-line">
            <div className="flex items-center gap-4 py-4">
              <span className="w-12 h-14 shrink-0 border border-ink flex items-center justify-center text-[0.65rem] tracking-wider">
                {isLink ? "LINK" : extOf(a.file_name) || KIND_LABEL[a.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate hover:text-accent underline-offset-4 hover:underline"
                >
                  {a.file_name}
                </a>
                <p className="text-xs text-muted truncate">
                  {isLink ? a.url : `${KIND_LABEL[a.kind]} · ${formatBytes(a.size_bytes)}`}
                </p>
              </div>
              {!isLink && (
                <a href={fileUrl(a.storage_path, { download: true })} className="text-sm text-muted hover:text-ink shrink-0">
                  내려받기
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
