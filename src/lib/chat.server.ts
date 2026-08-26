import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ChatRow = { id: string; author: string; text: string; createdAt: string };

export async function fetchMessages(): Promise<ChatRow[]> {
  const { data } = await supabaseAdmin
    .from("chat_messages")
    .select("id, author, text, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  return (data ?? [])
    .map((m) => ({ id: m.id, author: m.author, text: m.text, createdAt: m.created_at }))
    .reverse();
}

export async function insertMessage(memberId: string, author: string, text: string) {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 300);
  if (!clean) return { ok: false as const, error: "Message is empty." };
  const { error } = await supabaseAdmin
    .from("chat_messages")
    .insert({ member_id: memberId, author, text: clean });
  if (error) return { ok: false as const, error: "Could not send that message." };
  return { ok: true as const };
}
