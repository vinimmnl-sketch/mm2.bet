import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { memberFromCookieHeader, type Member } from "./session.server";
import type { CoinflipRow, JackpotState, TransactionRow } from "./games.functions";

const JACKPOT_WINDOW_MS = 60_000;

export async function requireMember(cookieHeader: string | null): Promise<Member | null> {
  return memberFromCookieHeader(cookieHeader);
}

type MemberRef = { id: string; discord_username: string | null; roblox_username: string | null; discord_avatar: string | null; roblox_avatar: string | null };

function nameOf(m: MemberRef | null): { id: string; name: string; avatar: string | null } | null {
  if (!m) return null;
  return {
    id: m.id,
    name: m.discord_username ?? m.roblox_username ?? "Player",
    avatar: m.discord_avatar ?? m.roblox_avatar ?? null,
  };
}

const MEMBER_COLS = "id, discord_username, roblox_username, discord_avatar, roblox_avatar";

export async function fetchCoinflips(): Promise<CoinflipRow[]> {
  const { data } = await supabaseAdmin
    .from("coinflips")
    .select(
      `id, amount, creator_side, status, result, created_at, winner_id,
       creator:members!coinflips_creator_id_fkey(${MEMBER_COLS}),
       joiner:members!coinflips_joiner_id_fkey(${MEMBER_COLS})`,
    )
    .order("created_at", { ascending: false })
    .limit(30);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    amount: Number(row.amount),
    creatorSide: row.creator_side,
    status: row.status,
    result: row.result,
    createdAt: row.created_at,
    creator: nameOf(row.creator) ?? { id: "", name: "Player", avatar: null },
    joiner: nameOf(row.joiner),
    winnerId: row.winner_id,
  }));
}

export async function createFlip(
  memberId: string,
  _balance: number,
  amount: number,
  side: "heads" | "tails",
) {
  const { error } = await supabaseAdmin.rpc("adjust_balance", {
    _member_id: memberId,
    _delta: -amount,
    _kind: "coinflip_stake",
    _note: `Created coinflip (${side})`,
  });
  if (error) return { ok: false as const, error: "Not enough balance." };

  const { error: insertError } = await supabaseAdmin.from("coinflips").insert({
    creator_id: memberId,
    creator_side: side,
    amount,
    status: "open",
  });
  if (insertError) {
    await supabaseAdmin.rpc("adjust_balance", {
      _member_id: memberId,
      _delta: amount,
      _kind: "coinflip_refund",
      _note: "Failed to create coinflip",
    });
    return { ok: false as const, error: "Could not create the flip." };
  }
  return { ok: true as const };
}

export async function joinFlip(memberId: string, _balance: number, flipId: string) {
  const { data: flip } = await supabaseAdmin
    .from("coinflips")
    .select("id, amount, creator_id, creator_side, status")
    .eq("id", flipId)
    .maybeSingle();

  if (!flip || flip.status !== "open") return { ok: false as const, error: "That flip is gone." };
  if (flip.creator_id === memberId) return { ok: false as const, error: "You created this flip." };

  const amount = Number(flip.amount);
  const { error } = await supabaseAdmin.rpc("adjust_balance", {
    _member_id: memberId,
    _delta: -amount,
    _kind: "coinflip_stake",
    _note: "Joined coinflip",
  });
  if (error) return { ok: false as const, error: "Not enough balance." };

  const result = Math.random() < 0.5 ? "heads" : "tails";
  const winnerId = result === flip.creator_side ? flip.creator_id : memberId;

  const { error: updateError, data: updated } = await supabaseAdmin
    .from("coinflips")
    .update({
      joiner_id: memberId,
      result,
      winner_id: winnerId,
      status: "settled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", flipId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    await supabaseAdmin.rpc("adjust_balance", {
      _member_id: memberId,
      _delta: amount,
      _kind: "coinflip_refund",
      _note: "Flip already taken",
    });
    return { ok: false as const, error: "Someone beat you to it." };
  }

  await supabaseAdmin.rpc("adjust_balance", {
    _member_id: winnerId,
    _delta: amount * 2,
    _kind: "coinflip_win",
    _note: `Won coinflip (${result})`,
  });

  return { ok: true as const, result, won: winnerId === memberId };
}

export async function cancelFlip(memberId: string, flipId: string) {
  const { data: flip } = await supabaseAdmin
    .from("coinflips")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", flipId)
    .eq("creator_id", memberId)
    .eq("status", "open")
    .select("amount")
    .maybeSingle();

  if (!flip) return { ok: false as const, error: "Cannot cancel that flip." };

  await supabaseAdmin.rpc("adjust_balance", {
    _member_id: memberId,
    _delta: Number(flip.amount),
    _kind: "coinflip_refund",
    _note: "Cancelled coinflip",
  });
  return { ok: true as const };
}

async function openRound() {
  const { data: existing } = await supabaseAdmin
    .from("jackpot_rounds")
    .select("id, total, ends_at, status")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .maybeSingle();
  if (existing) return existing;

  const { data: created } = await supabaseAdmin
    .from("jackpot_rounds")
    .insert({ status: "open", total: 0 })
    .select("id, total, ends_at, status")
    .single();
  return created!;
}

async function settleIfDue() {
  const { data: round } = await supabaseAdmin
    .from("jackpot_rounds")
    .select("id, total, ends_at, status")
    .eq("status", "open")
    .not("ends_at", "is", null)
    .maybeSingle();
  if (!round || !round.ends_at) return;
  if (new Date(round.ends_at).getTime() > Date.now()) return;

  const { data: entries } = await supabaseAdmin
    .from("jackpot_entries")
    .select("member_id, amount")
    .eq("round_id", round.id);
  if (!entries?.length) return;

  const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  let ticket = Math.random() * total;
  let winnerId = entries[0]!.member_id;
  for (const entry of entries) {
    ticket -= Number(entry.amount);
    if (ticket <= 0) {
      winnerId = entry.member_id;
      break;
    }
  }

  const { data: closed } = await supabaseAdmin
    .from("jackpot_rounds")
    .update({ status: "settled", winner_id: winnerId, total, updated_at: new Date().toISOString() })
    .eq("id", round.id)
    .eq("status", "open")
    .select("id")
    .maybeSingle();
  if (!closed) return;

  await supabaseAdmin.rpc("adjust_balance", {
    _member_id: winnerId,
    _delta: total,
    _kind: "jackpot_win",
    _note: "Won the jackpot round",
  });
}

export async function fetchJackpot(): Promise<JackpotState> {
  await settleIfDue();
  const round = await openRound();

  const { data: entries } = await supabaseAdmin
    .from("jackpot_entries")
    .select(`id, amount, member_id, member:members!jackpot_entries_member_id_fkey(${MEMBER_COLS})`)
    .eq("round_id", round.id)
    .order("created_at", { ascending: true });

  const { data: last } = await supabaseAdmin
    .from("jackpot_rounds")
    .select(`total, winner:members!jackpot_rounds_winner_id_fkey(${MEMBER_COLS})`)
    .eq("status", "settled")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastWinner = last?.winner ? nameOf(last.winner as any) : null;

  return {
    roundId: round.id,
    total: Number(round.total ?? 0),
    endsAt: round.ends_at,
    status: round.status,
    entries: (entries ?? []).map((e: any) => ({
      id: e.id,
      amount: Number(e.amount),
      memberId: e.member_id,
      name: nameOf(e.member)?.name ?? "Player",
      avatar: nameOf(e.member)?.avatar ?? null,
    })),
    lastWinner: lastWinner ? { name: lastWinner.name, total: Number(last!.total) } : null,
  };
}

export async function enterJackpot(memberId: string, _balance: number, amount: number) {
  await settleIfDue();
  const round = await openRound();

  const { error } = await supabaseAdmin.rpc("adjust_balance", {
    _member_id: memberId,
    _delta: -amount,
    _kind: "jackpot_entry",
    _note: "Jackpot entry",
  });
  if (error) return { ok: false as const, error: "Not enough balance." };

  await supabaseAdmin.from("jackpot_entries").insert({
    round_id: round.id,
    member_id: memberId,
    amount,
  });

  await supabaseAdmin
    .from("jackpot_rounds")
    .update({
      total: Number(round.total ?? 0) + amount,
      ends_at: round.ends_at ?? new Date(Date.now() + JACKPOT_WINDOW_MS).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", round.id);

  return { ok: true as const };
}

export async function fetchTransactions(memberId: string): Promise<TransactionRow[]> {
  const { data } = await supabaseAdmin
    .from("transactions")
    .select("id, amount, kind, note, created_at")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((t) => ({
    id: t.id,
    amount: Number(t.amount),
    kind: t.kind,
    note: t.note,
    createdAt: t.created_at,
  }));
}
