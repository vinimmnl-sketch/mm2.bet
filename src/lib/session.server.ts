import { signPayload, verifyPayload } from "./sign.server";

export const SESSION_COOKIE = "mm2bet_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = { memberId: string; exp: number };

export type Member = {
  id: string;
  discord_id: string | null;
  discord_username: string | null;
  discord_avatar: string | null;
  roblox_id: string | null;
  roblox_username: string | null;
  roblox_avatar: string | null;
  balance: number;
};

export async function createSessionCookie(memberId: string): Promise<string> {
  const token = await signPayload({
    memberId,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  } satisfies SessionPayload);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function memberFromCookieHeader(cookieHeader: string | null): Promise<Member | null> {
  const payload = await verifyPayload<SessionPayload>(readCookie(cookieHeader, SESSION_COOKIE));
  if (!payload?.memberId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("members")
    .select(
      "id, discord_id, discord_username, discord_avatar, roblox_id, roblox_username, roblox_avatar, balance",
    )
    .eq("id", payload.memberId)
    .maybeSingle();
  return (data as Member | null) ?? null;
}
