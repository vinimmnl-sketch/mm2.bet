const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function key(): Promise<CryptoKey> {
  const secret = process.env["APP_SESSION_SECRET"];
  if (!secret) throw new Error("APP_SESSION_SECRET is not configured");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Signs an arbitrary JSON payload into a tamper-proof token. */
export async function signPayload(payload: unknown): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), encoder.encode(body)));
  return `${body}.${toBase64Url(sig)}`;
}

/** Verifies a token and returns its payload, or null when invalid/expired. */
export async function verifyPayload<T>(token: string | undefined | null): Promise<T | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await key(),
    fromBase64Url(sig),
    encoder.encode(body),
  );
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as {
      exp?: number;
    };
    if (typeof payload.exp === "number" && Date.now() > payload.exp) return null;
    return payload as T;
  } catch {
    return null;
  }
}
