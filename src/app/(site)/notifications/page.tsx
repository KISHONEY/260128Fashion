// 알림 목록: 내 자료/댓글에 달린 새 댓글, 답글, 멘션
import { EmptyState, PageHeader, btn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/types";
import { markAllRead, openNotification } from "./actions";

export const metadata = { title: "알림" };

const TYPE_TEXT: Record<NotificationType, string> = {
  comment: "새 의견을 남겼습니다",
  reply: "회원님의 댓글에 답글을 달았습니다",
  mention: "회원님을 언급했습니다",
};

type Row = {
  id: string;
  type: NotificationType;
  excerpt: string;
  read_at: string | null;
  created_at: string;
  actor: { display_name: string } | null;
};

export default async function NotificationsPage() {
  const me = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, excerpt, read_at, created_at, actor:profiles!notifications_actor_id_fkey(display_name)")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const items = (data ?? []) as unknown as Row[];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Notifications"
        title="알림"
        description={unread ? `읽지 않은 알림 ${unread}개` : "모든 알림을 확인했습니다."}
        actions={
          unread > 0 && (
            <form action={markAllRead}>
              <button className={btn.secondary}>모두 읽음으로 표시</button>
            </form>
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState title="알림이 없습니다">
          <p>누군가 회원님을 @멘션하거나 답글을 달면 여기에 표시됩니다.</p>
        </EmptyState>
      ) : (
        <ul className="border-t border-ink">
          {items.map((n) => (
            <li key={n.id} className="border-b border-line">
              <form action={openNotification}>
                <input type="hidden" name="id" value={n.id} />
                <button className="w-full text-left py-5 flex gap-4 items-start group">
                  <span
                    aria-hidden
                    className={`mt-2 h-2 w-2 rounded-full shrink-0 ${n.read_at ? "bg-transparent" : "bg-accent"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.read_at ? "text-muted" : ""}`}>
                      <strong className="font-semibold">{n.actor?.display_name ?? "누군가"}</strong>님이{" "}
                      {TYPE_TEXT[n.type]}
                      {!n.read_at && <span className="sr-only"> (읽지 않음)</span>}
                    </span>
                    <span className="mt-1 block text-sm text-muted line-clamp-2 group-hover:text-ink">
                      “{n.excerpt}”
                    </span>
                  </span>
                  <span className="text-xs text-muted shrink-0">{timeAgo(n.created_at)}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
