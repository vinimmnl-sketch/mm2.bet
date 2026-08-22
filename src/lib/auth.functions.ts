import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export type SessionMember = {
  id: string;
  discordUsername: string | null;
  discordAvatar: string | null;
  robloxUsername: string | null;
  robloxAvatar: string | null;
  balance: number;
};

export const getCurrentMember = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionMember | null> => {
    const { memberFromCookieHeader } = await import("./session.server");
    const member = await memberFromCookieHeader(getRequestHeader("cookie") ?? null);
    if (!member) return null;
    return {
      id: member.id,
      discordUsername: member.discord_username,
      discordAvatar: member.discord_avatar,
      robloxUsername: member.roblox_username,
      robloxAvatar: member.roblox_avatar,
      balance: Number(member.balance ?? 0),
    };
  },
);

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { clearSessionCookie } = await import("./session.server");
  setResponseHeader("Set-Cookie", clearSessionCookie());
  return { ok: true };
});

export const startRobloxChallenge = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ username: z.string().min(3).max(20) }).parse(input))
  .handler(async ({ data }) => {
    const { lookupRobloxUser } = await import("./roblox.server");
    const { signPayload } = await import("./sign.server");

    const user = await lookupRobloxUser(data.username);
    if (!user) return { ok: false as const, error: "That Roblox username does not exist." };

    const words = ["vault", "signal", "orbit", "ember", "quartz", "harbor", "nimbus", "cobalt"];
    const pick = () => words[Math.floor(Math.random() * words.length)]!;
    const code = `MM2BET-${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const challenge = await signPayload({
      robloxId: String(user.id),
      username: user.name,
      code,
      exp: Date.now() + 15 * 60 * 1000,
    });

    return { ok: true as const, code, challenge, robloxUsername: user.name };
  });

export const verifyRobloxChallenge = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ challenge: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    const { verifyPayload } = await import("./sign.server");
    const { getRobloxDescription, getRobloxAvatar } = await import("./roblox.server");
    const { createSessionCookie } = await import("./session.server");

    const payload = await verifyPayload<{ robloxId: string; username: string; code: string }>(
      data.challenge,
    );
    if (!payload) {
      return { ok: false as const, error: "Your verification code expired. Generate a new one." };
    }

    const description = await getRobloxDescription(payload.robloxId);
    if (description === null) {
      return { ok: false as const, error: "Roblox is not responding right now. Try again." };
    }
    if (!description.toLowerCase().includes(payload.code.toLowerCase())) {
      return {
        ok: false as const,
        error: "Code not found in your Roblox bio. Save your profile, then verify again.",
      };
    }

    const avatar = await getRobloxAvatar(payload.robloxId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member, error } = await supabaseAdmin
      .from("members")
      .upsert(
        {
          roblox_id: payload.robloxId,
          roblox_username: payload.username,
          roblox_avatar: avatar,
        },
        { onConflict: "roblox_id" },
      )
      .select("id")
      .single();

    if (error || !member) {
      console.error("Failed to store Roblox member", error);
      return { ok: false as const, error: "Could not save your account." };
    }

    setResponseHeader("Set-Cookie", await createSessionCookie(member.id));
    return { ok: true as const };
  });
