// 관리 화면 공통 레이아웃 (교수 전용)
import { SubNav } from "@/components/sub-nav";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <PageHeader eyebrow="Administration" title="관리" description="멤버 초대와 권한, 분류, 홈 화면의 교수 소개를 관리합니다." />
      <SubNav
        label="관리 메뉴"
        items={[
          { href: "/admin", label: "멤버 · 초대" },
          { href: "/admin/taxonomy", label: "카테고리 · 태그" },
          { href: "/admin/profile", label: "교수 소개" },
        ]}
      />
      {children}
    </>
  );
}
