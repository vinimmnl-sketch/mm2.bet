import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Server-side sliding-window rate limiter backed by the database, so the limit
 * is global across every browser, tab and server instance.
 * Returns true when the action is allowed.
 */
export async function allow(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("rate_limit_hit", {
    _key: key,
    _limit: limit,
    _window_seconds: windowSeconds,
  });
  // Fail closed on unexpected errors so the limiter can't be bypassed.
  if (error) return false;
  return data === true;
}

/** Hashes an identifier so raw IPs are never stored in the rate-limit table. */
export async function hashId(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function limitOrFail(
  action: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: false; error: string } | null> {
  const ok = await allow(`${action}:${await hashId(identity)}`, limit, windowSeconds);
  if (ok) return null;
  return { ok: false as const, error: "You're going too fast. Slow down and try again." };
}
