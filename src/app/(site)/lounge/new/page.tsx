import { PageHeader } from "@/components/ui";
import { LoungeForm } from "../lounge-form";

export const metadata = { title: "라운지 글쓰기" };

export default function NewLoungePostPage() {
  return (
    <>
      <PageHeader eyebrow="Lab Lounge · New" title="글쓰기" />
      <LoungeForm />
    </>
  );
}
