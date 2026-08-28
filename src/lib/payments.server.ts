import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const TOKENS_PER_USD = 100;
const NP_API = "https://api.nowpayments.io/v1";

function apiKey(): string {
  const key = process.env["NOWPAYMENTS_API_KEY"];
  if (!key) throw new Error("NOWPAYMENTS_API_KEY is not configured");
  return key;
}

function siteOrigin(requestUrl: string): string {
  return new URL(requestUrl).origin;
}

export type DepositRow = {
  id: string;
  tokens: number;
  usd: number;
  status: string;
  currency: string | null;
  createdAt: string;
};

export type WithdrawalRow = {
  id: string;
  tokens: number;
  usd: number;
  currency: string;
  address: string;
  status: string;
  createdAt: string;
};

/** Creates a NOWPayments invoice and returns the embeddable widget URL. */
export async function createDeposit(memberId: string, usd: number, requestUrl: string) {
  const origin = siteOrigin(requestUrl);
  const tokens = Math.round(usd * TOKENS_PER_USD);

  const { data: row, error: insertError } = await supabaseAdmin
    .from("deposits")
    .insert({ member_id: memberId, price_amount: usd, tokens, status: "waiting" })
    .select("id")
    .single();

  if (insertError || !row) {
    return { ok: false as const, error: "Could not start that deposit." };
  }

  let response: Response;
  try {
    response = await fetch(`${NP_API}/invoice`, {
      method: "POST",
      headers: { "x-api-key": apiKey(), "Content-Type": "application/json" },
      body: JSON.stringify({
        price_amount: usd,
        price_currency: "usd",
        order_id: row.id,
        order_description: `MM2Bet ${tokens} tokens`,
        ipn_callback_url: `${origin}/api/public/payments/nowpayments`,
        success_url: `${origin}/?deposit=success`,
        cancel_url: `${origin}/?deposit=cancelled`,
        is_fee_paid_by_user: true,
      }),
    });
  } catch {
    return { ok: false as const, error: "Payment provider is unreachable. Try again." };
  }

  if (!response.ok) {
    console.error("NOWPayments invoice failed", response.status, await response.text());
    return { ok: false as const, error: "Payment provider rejected that amount." };
  }

  const invoice = (await response.json()) as { id?: string | number; invoice_url?: string };
  const invoiceId = invoice.id != null ? String(invoice.id) : null;
  if (!invoiceId) return { ok: false as const, error: "Payment provider returned no invoice." };

  await supabaseAdmin.from("deposits").update({ invoice_id: invoiceId }).eq("id", row.id);

  return {
    ok: true as const,
    depositId: row.id,
    invoiceId,
    tokens,
    // Embedded widget — the whole payment happens inside our page.
    embedUrl: `https://nowpayments.io/embeds/payment-widget?iid=${invoiceId}`,
  };
}

export async function listDeposits(memberId: string): Promise<DepositRow[]> {
  const { data } = await supabaseAdmin
    .from("deposits")
    .select("id, tokens, price_amount, status, pay_currency, created_at")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((d) => ({
    id: d.id,
    tokens: Number(d.tokens),
    usd: Number(d.price_amount),
    status: d.status,
    currency: d.pay_currency,
    createdAt: d.created_at,
  }));
}

export async function listWithdrawals(memberId: string): Promise<WithdrawalRow[]> {
  const { data } = await supabaseAdmin
    .from("withdrawals")
    .select("id, tokens, usd_amount, currency, address, status, created_at")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((w) => ({
    id: w.id,
    tokens: Number(w.tokens),
    usd: Number(w.usd_amount),
    currency: w.currency,
    address: w.address,
    status: w.status,
    createdAt: w.created_at,
  }));
}

/**
 * NOWPayments mass-payouts need an account JWT (email + password), which is
 * optional. When those credentials exist the payout is sent automatically;
 * otherwise the request is queued for an admin to release.
 */
async function payoutToken(): Promise<string | null> {
  const email = process.env["NOWPAYMENTS_EMAIL"];
  const password = process.env["NOWPAYMENTS_PASSWORD"];
  if (!email || !password) return null;
  try {
    const res = await fetch(`${NP_API}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: string };
    return body.token ?? null;
  } catch {
    return null;
  }
}

export async function requestWithdrawal(
  memberId: string,
  tokens: number,
  currency: string,
  address: string,
) {
  const usd = tokens / TOKENS_PER_USD;

  const { error: balanceError } = await supabaseAdmin.rpc("adjust_balance", {
    _member_id: memberId,
    _delta: -tokens,
    _kind: "withdrawal",
    _note: `Withdrawal to ${currency.toUpperCase()}`,
  });
  if (balanceError) return { ok: false as const, error: "Not enough balance." };

  const { data: row } = await supabaseAdmin
    .from("withdrawals")
    .insert({
      member_id: memberId,
      tokens,
      usd_amount: usd,
      currency: currency.toLowerCase(),
      address,
      status: "pending",
    })
    .select("id")
    .single();

  const token = await payoutToken();
  if (!token || !row) {
    return {
      ok: true as const,
      message: "Withdrawal requested. It will be sent shortly.",
    };
  }

  try {
    const res = await fetch(`${NP_API}/payout`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey(),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ipn_callback_url: undefined,
        withdrawals: [{ address, currency: currency.toLowerCase(), amount: usd, fiat_currency: "usd" }],
      }),
    });
    if (res.ok) {
      const body = (await res.json()) as { id?: string | number };
      await supabaseAdmin
        .from("withdrawals")
        .update({ status: "sent", payout_id: body.id != null ? String(body.id) : null })
        .eq("id", row.id);
      return { ok: true as const, message: "Payout sent to your wallet." };
    }
    console.error("NOWPayments payout failed", res.status, await res.text());
  } catch (error) {
    console.error("NOWPayments payout error", error);
  }

  return { ok: true as const, message: "Withdrawal queued for manual release." };
}

/** Verifies the IPN HMAC-SHA512 signature over the key-sorted JSON body. */
export async function verifyIpnSignature(rawBody: string, signature: string | null) {
  const secret = process.env["NOWPAYMENTS_IPN_SECRET"];
  if (!secret || !signature) return false;

  const sorted = JSON.stringify(sortValue(JSON.parse(rawBody)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sorted));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortValue((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/** Credits tokens exactly once per finished payment. */
export async function applyIpn(payload: {
  payment_status?: string;
  payment_id?: string | number;
  order_id?: string;
  pay_currency?: string;
}) {
  const orderId = payload.order_id;
  if (!orderId) return;

  const { data: deposit } = await supabaseAdmin
    .from("deposits")
    .select("id, member_id, tokens, credited")
    .eq("id", orderId)
    .maybeSingle();
  if (!deposit) return;

  const status = payload.payment_status ?? "waiting";
  await supabaseAdmin
    .from("deposits")
    .update({
      status,
      payment_id: payload.payment_id != null ? String(payload.payment_id) : null,
      pay_currency: payload.pay_currency ?? null,
    })
    .eq("id", deposit.id);

  const finished = status === "finished" || status === "confirmed";
  if (!finished || deposit.credited) return;

  const { data: claimed } = await supabaseAdmin
    .from("deposits")
    .update({ credited: true })
    .eq("id", deposit.id)
    .eq("credited", false)
    .select("id")
    .maybeSingle();
  if (!claimed) return;

  await supabaseAdmin.rpc("adjust_balance", {
    _member_id: deposit.member_id,
    _delta: Number(deposit.tokens),
    _kind: "deposit",
    _note: "Crypto deposit",
  });
}
