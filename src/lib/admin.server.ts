import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function memberIsAdmin(memberId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("member_roles")
    .select("id")
    .eq("member_id", memberId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export type AdminMemberRow = {
  id: string;
  name: string;
  discordUsername: string | null;
  robloxUsername: string | null;
  balance: number;
  isAdmin: boolean;
};

export async function searchMembersFor(query: string): Promise<AdminMemberRow[]> {
  let request = supabaseAdmin
    .from("members")
    .select("id, discord_username, roblox_username, balance")
    .order("balance", { ascending: false })
    .limit(25);

  const term = query.trim();
  if (term) {
    request = request.or(
      `discord_username.ilike.%${term}%,roblox_username.ilike.%${term}%`,
    );
  }

  const { data } = await request;
  const rows = data ?? [];
  const { data: admins } = await supabaseAdmin
    .from("member_roles")
    .select("member_id")
    .eq("role", "admin");
  const adminIds = new Set((admins ?? []).map((a) => a.member_id));

  return rows.map((m) => ({
    id: m.id,
    name: m.discord_username ?? m.roblox_username ?? "Player",
    discordUsername: m.discord_username,
    robloxUsername: m.roblox_username,
    balance: Number(m.balance ?? 0),
    isAdmin: adminIds.has(m.id),
  }));
}

export async function grantTokensTo(targetId: string, amount: number, note: string) {
  const { error } = await supabaseAdmin.rpc("adjust_balance", {
    _member_id: targetId,
    _delta: amount,
    _kind: amount >= 0 ? "admin_grant" : "admin_deduct",
    _note: note || (amount >= 0 ? "Admin grant" : "Admin deduction"),
  });
  if (error) return { ok: false as const, error: "Could not adjust that balance." };
  return { ok: true as const };
}

export async function playBotFlip(memberId: string, amount: number, side: "heads" | "tails") {
  const { error } = await supabaseAdmin.rpc("adjust_balance", {
    _member_id: memberId,
    _delta: -amount,
    _kind: "coinflip_stake",
    _note: `Bot coinflip (${side})`,
  });
  if (error) return { ok: false as const, error: "Not enough balance." };

  const result: "heads" | "tails" = Math.random() < 0.5 ? "heads" : "tails";
  const won = result === side;

  await supabaseAdmin.from("coinflips").insert({
    creator_id: memberId,
    creator_side: side,
    amount,
    status: "settled",
    result,
    winner_id: won ? memberId : null,
  });

  if (won) {
    await supabaseAdmin.rpc("adjust_balance", {
      _member_id: memberId,
      _delta: amount * 2,
      _kind: "coinflip_win",
      _note: `Beat the bot (${result})`,
    });
  }

  return { ok: true as const, result, won };
}
