// 마크다운 표시 컴포넌트
// - react-markdown: 마크다운을 안전하게 화면에 그려 줌 (HTML 태그는 실행하지 않아 XSS 방지)
// - remark-gfm: 표, 취소선, 자동 링크 등 "깃허브식" 마크다운 지원
// - @멘션: 멘션된 이름을 강조 표시
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "@홍길동" → 멘션 표시용 링크 문법으로 바꿔 둔 뒤, 아래 a 컴포넌트에서 강조 처리
function highlightMentions(text: string, mentions: { id: string; name: string }[]) {
  let out = text;
  // 긴 이름부터 바꿔야 "김수" 와 "김수진" 이 섞이지 않음
  [...mentions]
    .sort((a, b) => b.name.length - a.name.length)
    .forEach((m) => {
      const re = new RegExp(`(^|[^\\w@\\[])@${escapeRegExp(m.name)}(?![\\w가-힣])`, "g");
      out = out.replace(re, `$1[@${m.name}](#mention-${m.id})`);
    });
  return out;
}

export function Markdown({
  children,
  mentions = [],
  compact = false,
}: {
  children: string;
  mentions?: { id: string; name: string }[];
  compact?: boolean;
}) {
  const text = mentions.length ? highlightMentions(children, mentions) : children;
  return (
    <div className={`prose-editorial ${compact ? "prose-compact" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children: linkChildren }) {
            if (href?.startsWith("#mention-")) {
              return <span className="mention">{linkChildren}</span>;
            }
            const external = href?.startsWith("http");
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {linkChildren}
              </a>
            );
          },
          // 본문 속 이미지 링크는 외부 추적을 막기 위해 링크로만 표시
          img({ src, alt }) {
            return typeof src === "string" ? (
              <a href={src} target="_blank" rel="noopener noreferrer">
                [이미지: {alt || src}]
              </a>
            ) : null;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
