import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";
import { SiteSettingsForm } from "../forms";

export const metadata = { title: "교수 소개 관리" };

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle<SiteSettings>();
  const settings: SiteSettings = data ?? {
    id: 1, name: "", title: "", bio: "", research_areas: [], email: "", office: "", photo_path: null, updated_at: "",
  };
  return <SiteSettingsForm settings={settings} />;
}
