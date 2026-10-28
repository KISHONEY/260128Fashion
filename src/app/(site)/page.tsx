// 홈 대시보드: 교수 소개 · 내가 받은 멘션 · 최근 연구 자료 · 최근 토론
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { ResearchCard, type ResearchListItem } from "@/components/research-card";
import { SectionTitle, btn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fileUrl, formatDate, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";

type RecentComment = {
  id: string;
  body: string;
  created_at: string;
  author: { display_name: string } | null;
  research: { id: string; title: string } | null;
  course: { id: string; title: string } | null;
  lounge: { id: string; title: string } | null;
};

type MentionRow = {
  id: string;
  excerpt: string;
  link: string;
  read_at: string | null;
  created_at: string;
  actor: { display_name: string } | null;
};

function commentTarget(c: RecentComment) {
  if (c.research) return { label: "연구", title: c.research.title, href: `/research/${c.research.id}#comment-${c.id}` };
  if (c.course) return { label: "수업", title: c.course.title, href: `/courses/${c.course.id}#comment-${c.id}` };
  if (c.lounge) return { label: "라운지", title: c.lounge.title, href: `/lounge/${c.lounge.id}#comment-${c.id}` };
  return { label: "", title: "", href: "#" };
}

export default async function HomePage() {
  const me = await requireUser();
  const supabase = await createClient();

  const [{ data: settings }, { data: research }, { data: comments }, { data: mentions }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle<SiteSettings>(),
    supabase
      .from("research")
      .select("id, title, summary, year, status, cover_path, category:categories(name), tags:research_tags(tag:tags(name))")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("comments")
      .select(
        "id, body, created_at, author:profiles!comments_author_id_fkey(display_name), " +
          "research:research!comments_research_id_fkey(id, title), " +
          "course:course_materials!comments_course_material_id_fkey(id, title), " +
          "lounge:lounge_posts!comments_lounge_post_id_fkey(id, title)",
      )
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("notifications")
      .select("id, excerpt, link, read_at, created_at, actor:profiles!notifications_actor_id_fkey(display_name)")
      .eq("user_id", me.id)
      .eq("type", "mention")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const s = settings;
  const recentResearch = (research ?? []) as unknown as ResearchListItem[];
  const recentComments = (comments ?? []) as unknown as RecentComment[];
  const myMentions = (mentions ?? []) as unknown as MentionRow[];
  const hasProfile = Boolean(s && (s.name || s.bio));

  return (
    <div className="flex flex-col gap-20 md:gap-28">
      {/* 인사 + 교수 소개 */}
      <section className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div>
          <p className="eyebrow mb-6">
            {formatDate(new Date().toISOString())} — {me.display_name}님, 안녕하세요
          </p>
          {hasProfile ? (
            <div className="grid gap-8 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-10 items-start">
              {s!.photo_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl(s!.photo_path)}
                  alt={`${s!.name} 사진`}
                  className="w-full max-w-60 aspect-[4/5] object-cover bg-paper-deep grayscale-[15%]"
                />
              ) : (
                <div aria-hidden className="w-full max-w-60 aspect-[4/5] bg-paper-deep flex items-center justify-center font-serif text-7xl text-ink/20">
                  {s!.name.slice(0, 1)}
                </div>
              )}
              <div>
                <h1 className="font-serif text-5xl md:text-7xl leading-[1.02] tracking-tight">{s!.name}</h1>
                {s!.title && <p className="mt-3 text-muted">{s!.title}</p>}
                {s!.bio && (
                  <div className="mt-6 max-w-2xl">
                    <Markdown>{s!.bio}</Markdown>
                  </div>
                )}
                {s!.research_areas.length > 0 && (
                  <div className="mt-6">
                    <p className="eyebrow mb-2">연구 분야</p>
                    <ul className="flex flex-wrap gap-2">
                      {s!.research_areas.map((a) => (
                        <li key={a} className="border border-ink px-3 py-1 text-sm">
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(s!.email || s!.office) && (
                  <dl className="mt-6 grid grid-cols-[4rem_1fr] gap-y-1 text-sm">
                    {s!.email && (
                      <>
                        <dt className="text-muted">이메일</dt>
                        <dd>
                          <a href={`mailto:${s!.email}`} className="hover:text-accent underline-offset-4 hover:underline">
                            {s!.email}
                          </a>
                        </dd>
                      </>
                    )}
                    {s!.office && (
                      <>
                        <dt className="text-muted">연구실</dt>
                        <dd>{s!.office}</dd>
                      </>
                    )}
                  </dl>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h1 className="font-serif text-5xl md:text-7xl leading-[1.02] tracking-tight">
                Research
                <br />
                <em className="text-muted">Archive</em>
              </h1>
              {me.role === "admin" && (
                <p className="mt-6 text-muted">
                  아직 교수 소개가 없습니다.{" "}
                  <Link href="/admin/profile" className="text-ink underline underline-offset-4">
                    관리 › 교수 소개
                  </Link>
                  에서 사진과 연구 분야를 입력해 보세요.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 내가 받은 멘션 */}
        <aside aria-labelledby="mentions-title" className="bg-ink text-paper p-6 md:p-8 self-start">
          <div className="flex items-baseline justify-between mb-5">
            <h2 id="mentions-title" className="font-serif text-2xl">
              나를 부른 대화
            </h2>
            <Link href="/notifications" className="text-xs text-paper/60 hover:text-paper">
              알림 전체 →
            </Link>
          </div>
          {myMentions.length === 0 ? (
            <p className="text-sm text-paper/60 leading-relaxed">아직 받은 멘션이 없습니다. 누군가 @{me.display_name} 으로 부르면 여기에 표시됩니다.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-paper/15">
              {myMentions.map((m) => (
                <li key={m.id} className="py-3 first:pt-0">
                  <Link href={m.link} className="block group">
                    <span className="text-xs text-paper/60">
                      {!m.read_at && <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#e0a196] mr-1.5 align-middle" aria-label="읽지 않음" />}
                      {m.actor?.display_name ?? "누군가"} · {timeAgo(m.created_at)}
                    </span>
                    <span className="block mt-1 text-sm line-clamp-2 group-hover:underline underline-offset-4">{m.excerpt}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      {/* 최근 연구 자료 */}
      <section aria-label="최근 연구 자료">
        <SectionTitle index="01" title="최근 연구" href="/research" />
        {recentResearch.length === 0 ? (
          <p className="text-muted text-sm py-6">
            아직 연구 자료가 없습니다.
            {me.role === "admin" && (
              <Link href="/research/new" className={`${btn.ghost} ml-2`}>
                첫 연구 자료 올리기 →
              </Link>
            )}
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-10 md:gap-y-14">
            {recentResearch.map((r, i) => (
              <ResearchCard key={r.id} item={r} priority={i < 3} />
            ))}
          </div>
        )}
      </section>

      {/* 최근 토론 */}
      <section aria-label="최근 토론">
        <SectionTitle index="02" title="최근 토론" href="/lounge" linkLabel="라운지로" />
        {recentComments.length === 0 ? (
          <p className="text-muted text-sm py-6">아직 토론이 없습니다.</p>
        ) : (
          <ul className="grid md:grid-cols-2 gap-x-12">
            {recentComments.map((c) => {
              const t = commentTarget(c);
              return (
                <li key={c.id} className="border-b border-line">
                  <Link href={t.href} className="block py-5 group">
                    <span className="eyebrow">
                      {t.label} · {t.title}
                    </span>
                    <span className="block mt-2 font-serif text-lg leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                      “{c.body.replace(/[#*_>`]/g, "")}”
                    </span>
                    <span className="block mt-2 text-xs text-muted">
                      {c.author?.display_name ?? "탈퇴한 멤버"} · {timeAgo(c.created_at)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
