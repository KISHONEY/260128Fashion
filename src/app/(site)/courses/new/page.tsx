import { randomUUID } from "crypto";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "../course-form";

export const metadata = { title: "수업 자료 등록" };

export default async function NewCoursePage({ searchParams }: PageProps<"/courses/new">) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("course_materials").select("semester, course_name");
  const semesters = [...new Set((data ?? []).map((d) => d.semester as string))].sort().reverse();
  const courseNames = [...new Set((data ?? []).map((d) => d.course_name as string))].sort();

  return (
    <>
      <PageHeader eyebrow="Courses · New" title="수업 자료 등록" />
      <CourseForm
        mode="new"
        id={randomUUID()}
        semesters={semesters}
        courseNames={courseNames}
        defaults={{
          semester: typeof sp.semester === "string" ? sp.semester : undefined,
          course: typeof sp.course === "string" ? sp.course : undefined,
        }}
        attachments={[]}
      />
    </>
  );
}
