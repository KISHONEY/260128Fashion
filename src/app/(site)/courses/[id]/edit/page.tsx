import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Attachment, CourseMaterial } from "@/lib/types";
import { CourseForm } from "../../course-form";

export const metadata = { title: "수업 자료 수정" };

export default async function EditCoursePage({ params }: PageProps<"/courses/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data: material } = await supabase.from("course_materials").select("*").eq("id", id).maybeSingle<CourseMaterial>();
  if (!material) notFound();
  const [{ data: all }, { data: attachments }] = await Promise.all([
    supabase.from("course_materials").select("semester, course_name"),
    supabase.from("attachments").select("*").eq("course_material_id", id).order("sort_order"),
  ]);

  return (
    <>
      <PageHeader eyebrow="Courses · Edit" title="수업 자료 수정" />
      <CourseForm
        mode="edit"
        id={id}
        material={material}
        semesters={[...new Set((all ?? []).map((d) => d.semester as string))].sort().reverse()}
        courseNames={[...new Set((all ?? []).map((d) => d.course_name as string))].sort()}
        attachments={(attachments ?? []) as Attachment[]}
      />
    </>
  );
}
