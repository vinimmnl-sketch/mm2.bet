import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export type AdminMember = {
  id: string;
  name: string;
  discordUsername: string | null;
  robloxUsername: string | null;
  balance: number;
  isAdmin: boolean;
};

export const amIAdmin = createServerFn({ method: "GET" }).handler(async (): Promise<boolean> => {
  const { memberFromCookieHeader } = await import("./session.server");
  const { memberIsAdmin } = await import("./admin.server");
  const member = await memberFromCookieHeader(getRequestHeader("cookie") ?? null);
  if (!member) return false;
  return memberIsAdmin(member.id);
});

export const adminSearchMembers = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ query: z.string().max(60).default("") }).parse(input))
  .handler(async ({ data }): Promise<AdminMember[]> => {
    const { memberFromCookieHeader } = await import("./session.server");
    const { memberIsAdmin, searchMembersFor } = await import("./admin.server");
    const member = await memberFromCookieHeader(getRequestHeader("cookie") ?? null);
    if (!member || !(await memberIsAdmin(member.id))) return [];
    return searchMembersFor(data.query);
  });

export const adminGrantTokens = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        memberId: z.string().uuid(),
        amount: z.number().refine((n) => n !== 0 && Math.abs(n) <= 1_000_000),
        note: z.string().max(120).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { memberFromCookieHeader } = await import("./session.server");
    const { memberIsAdmin, grantTokensTo } = await import("./admin.server");
    const member = await memberFromCookieHeader(getRequestHeader("cookie") ?? null);
    if (!member || !(await memberIsAdmin(member.id))) {
      return { ok: false as const, error: "Admins only." };
    }
    return grantTokensTo(data.memberId, data.amount, data.note);
  });

export const playBotCoinflip = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ amount: z.number().positive().max(1_000_000), side: z.enum(["heads", "tails"]) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { memberFromCookieHeader } = await import("./session.server");
    const { playBotFlip } = await import("./admin.server");
    const member = await memberFromCookieHeader(getRequestHeader("cookie") ?? null);
    if (!member) return { ok: false as const, error: "Sign in first." };
    return playBotFlip(member.id, data.amount, data.side);
  });
