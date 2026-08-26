import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export type CoinflipRow = {
  id: string;
  amount: number;
  creatorSide: string;
  status: string;
  result: string | null;
  createdAt: string;
  creator: { id: string; name: string; avatar: string | null };
  joiner: { id: string; name: string; avatar: string | null } | null;
  winnerId: string | null;
};

export type JackpotState = {
  roundId: string;
  roundNumber: number;
  playerCount: number;
  total: number;
  endsAt: string | null;
  status: string;
  entries: { id: string; amount: number; name: string; avatar: string | null; memberId: string }[];
  lastWinner: { name: string; total: number } | null;
};

export type JackpotHistoryRow = {
  id: string;
  roundNumber: number;
  total: number;
  winner: string;
  settledAt: string;
};

export type TransactionRow = {
  id: string;
  amount: number;
  kind: string;
  note: string | null;
  createdAt: string;
};

export const listCoinflips = createServerFn({ method: "GET" }).handler(
  async (): Promise<CoinflipRow[]> => {
    const { fetchCoinflips } = await import("./games.server");
    return fetchCoinflips();
  },
);

export const createCoinflip = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ amount: z.number().positive().max(1_000_000), side: z.enum(["heads", "tails"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { requireMember, createFlip } = await import("./games.server");
    const { limitOrFail } = await import("./rate-limit.server");
    const member = await requireMember(getRequestHeader("cookie") ?? null);
    if (!member) return { ok: false as const, error: "Sign in first." };
    const limited = await limitOrFail("flip-create", member.id, 10, 30);
    if (limited) return limited;
    return createFlip(member.id, Number(member.balance), data.amount, data.side);
  });

export const joinCoinflip = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { requireMember, joinFlip } = await import("./games.server");
    const { limitOrFail } = await import("./rate-limit.server");
    const member = await requireMember(getRequestHeader("cookie") ?? null);
    if (!member) return { ok: false as const, error: "Sign in first." };
    const limited = await limitOrFail("flip-join", member.id, 15, 30);
    if (limited) return limited;
    return joinFlip(member.id, Number(member.balance), data.id);
  });

export const cancelCoinflip = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { requireMember, cancelFlip } = await import("./games.server");
    const member = await requireMember(getRequestHeader("cookie") ?? null);
    if (!member) return { ok: false as const, error: "Sign in first." };
    return cancelFlip(member.id, data.id);
  });

export const getJackpot = createServerFn({ method: "GET" }).handler(
  async (): Promise<JackpotState> => {
    const { fetchJackpot } = await import("./games.server");
    return fetchJackpot();
  },
);

export const listJackpotHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<JackpotHistoryRow[]> => {
    const { fetchJackpotHistory } = await import("./games.server");
    return fetchJackpotHistory();
  },
);

export const joinJackpot = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ amount: z.number().positive().max(1_000_000) }).parse(input))
  .handler(async ({ data }) => {
    const { requireMember, enterJackpot } = await import("./games.server");
    const { limitOrFail } = await import("./rate-limit.server");
    const member = await requireMember(getRequestHeader("cookie") ?? null);
    if (!member) return { ok: false as const, error: "Sign in first." };
    const limited = await limitOrFail("jackpot-join", member.id, 10, 30);
    if (limited) return limited;
    return enterJackpot(member.id, Number(member.balance), data.amount);
  });

export const listTransactions = createServerFn({ method: "GET" }).handler(
  async (): Promise<TransactionRow[]> => {
    const { requireMember, fetchTransactions } = await import("./games.server");
    const member = await requireMember(getRequestHeader("cookie") ?? null);
    if (!member) return [];
    return fetchTransactions(member.id);
  },
);
