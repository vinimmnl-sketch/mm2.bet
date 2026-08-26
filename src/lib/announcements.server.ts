import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  createdAt: string;
};

export async function fetchActiveAnnouncement(): Promise<AnnouncementRow | null> {
  const { data } = await supabaseAdmin
    .from("announcements")
    .select("id, title, body, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    body: data.body,
    active: data.active,
    createdAt: data.created_at,
  };
}

export async function fetchAllAnnouncements(): Promise<AnnouncementRow[]> {
  const { data } = await supabaseAdmin
    .from("announcements")
    .select("id, title, body, active, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    active: a.active,
    createdAt: a.created_at,
  }));
}

export async function createAnnouncement(
  memberId: string,
  title: string,
  body: string,
) {
  // Only one announcement pops up at a time.
  await supabaseAdmin.from("announcements").update({ active: false }).eq("active", true);
  const { error } = await supabaseAdmin
    .from("announcements")
    .insert({ title, body, created_by: memberId, active: true });
  if (error) return { ok: false as const, error: "Could not publish that announcement." };
  return { ok: true as const };
}

export async function deactivateAnnouncement(id: string) {
  const { error } = await supabaseAdmin
    .from("announcements")
    .update({ active: false })
    .eq("id", id);
  if (error) return { ok: false as const, error: "Could not hide that announcement." };
  return { ok: true as const };
}
