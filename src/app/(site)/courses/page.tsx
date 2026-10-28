// 수업 자료: 학기 → 과목 → 주차 순으로 탐색
import Link from "next/link";
import { EmptyState, PageHeader, btn } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { KIND_LABEL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { AttachmentKind, CourseAudience } from "@/lib/types";

export const metadata = { title: "수업" };

type Row = {
  id: string;
  semester: string;
  course_name: string;
  week: number | null;
  title: string;
  audience: CourseAudience;
  attachments: { kind: AttachmentKind }[];
};

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

// 학기 정렬: 최신 학기가 위로 (문자열 내림차순)
const bySemesterDesc = (a: string, b: string) => b.localeCompare(a, "ko");

export default async function CoursesPage({ searchParams }: PageProps<"/courses">) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_materials")
    .select("id, semester, course_name, week, title, audience, attachments(kind)")
    .order("week", { ascending: true })
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as Row[];

  const semesters = [...new Set(rows.map((r) => r.semester))].sort(bySemesterDesc);
  const semester = semesters.includes(str(sp.semester)) ? str(sp.semester) : (semesters[0] ?? "");
  const inSemester = rows.filter((r) => r.semester === semester);
  const courses = [...new Set(inSemester.map((r) => r.course_name))].sort((a, b) => a.localeCompare(b, "ko"));
  const course = courses.includes(str(sp.course)) ? str(sp.course) : (courses[0] ?? "");
  const materials = inSemester.filter((r) => r.course_name === course);

  // 주차별로 묶기 (0 = 공통 자료)
  const weeks = new Map<number, Row[]>();
  materials.forEach((m) => {
    const w = m.week ?? 0;
    weeks.set(w, [...(weeks.get(w) ?? []), m]);
  });
  const weekKeys = [...weeks.keys()].sort((a, b) => a - b);

  const isAdmin = user?.role === "admin";
  const newHref = `/courses/new?semester=${encodeURIComponent(semester)}&course=${encodeURIComponent(course)}`;

  return (
    <>
      <PageHeader
        eyebrow="Course Materials"
        title="수업"
        description="학기와 과목을 고르면 주차별 수업 자료를 볼 수 있습니다."
        actions={
          isAdmin && (
            <Link href={semester ? newHref : "/courses/new"} className={btn.primary}>
              + 수업 자료 등록
            </Link>
          )
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="아직 등록된 수업 자료가 없습니다">
          {isAdmin && <p>오른쪽 위 [+ 수업 자료 등록] 버튼으로 첫 자료를 올려 보세요.</p>}
        </EmptyState>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-16">
          {/* 왼쪽: 학기와 과목 선택 */}
          <aside className="flex flex-col gap-8">
            <nav aria-label="학기">
              <h2 className="eyebrow mb-3">학기</h2>
              <ul className="flex lg:flex-col gap-2 overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0">
                {semesters.map((s) => (
                  <li key={s} className="shrink-0">
                    <Link
                      href={`/courses?semester=${encodeURIComponent(s)}`}
                      aria-current={s === semester ? "page" : undefined}
                      className={`block px-3 py-2 border text-sm ${
                        s === semester ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
                      }`}
                    >
                      {s}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="과목">
              <h2 className="eyebrow mb-3">과목</h2>
              <ul className="border-t border-line">
                {courses.map((c) => (
                  <li key={c} className="border-b border-line">
                    <Link
                      href={`/courses?semester=${encodeURIComponent(semester)}&course=${encodeURIComponent(c)}`}
                      aria-current={c === course ? "page" : undefined}
                      className={`flex items-center justify-between py-3 text-sm ${
                        c === course ? "text-ink font-semibold" : "text-muted hover:text-ink"
                      }`}
                    >
                      {c}
                      {c === course && <span className="text-accent">→</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* 오른쪽: 주차별 자료 */}
          <section aria-labelledby="course-title">
            <p className="eyebrow">{semester}</p>
            <h2 id="course-title" className="font-serif text-3xl md:text-5xl mt-2 mb-8">
              {course}
            </h2>
            <ol className="border-t border-ink">
              {weekKeys.map((w) => (
                <li key={w} className="grid grid-cols-[4.5rem_1fr] md:grid-cols-[7rem_1fr] gap-4 border-b border-line py-6">
                  <div>
                    <span className="eyebrow block">{w === 0 ? "Common" : "Week"}</span>
                    <span className="font-serif text-3xl md:text-5xl leading-none">
                      {w === 0 ? "공통" : String(w).padStart(2, "0")}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-4">
                    {weeks.get(w)!.map((m) => {
                      const kinds = [...new Set(m.attachments.map((a) => a.kind))];
                      return (
                        <li key={m.id}>
                          <Link href={`/courses/${m.id}`} className="group block">
                            <span className="font-serif text-xl md:text-2xl group-hover:text-accent transition-colors">
                              {m.title}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                              {kinds.map((k) => (
                                <span key={k} className="border border-line px-1.5">
                                  {KIND_LABEL[k]}
                                </span>
                              ))}
                              {m.audience === "admin_only" && <span className="text-accent">비공개</span>}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  );
}
