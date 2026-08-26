import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

export type ChatMessage = { id: string; author: string; text: string; createdAt: string };

export const listChatMessages = createServerFn({ method: "GET" }).handler(
  async (): Promise<ChatMessage[]> => {
    const { fetchMessages } = await import("./chat.server");
    return fetchMessages();
  },
);

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ text: z.string().min(1).max(300) }).parse(input))
  .handler(async ({ data }) => {
    const { memberFromCookieHeader } = await import("./session.server");
    const { insertMessage } = await import("./chat.server");
    const { limitOrFail } = await import("./rate-limit.server");

    const member = await memberFromCookieHeader(getRequestHeader("cookie") ?? null);
    if (!member) return { ok: false as const, error: "Sign in to chat." };

    const ipLimited = await limitOrFail("chat-ip", getRequestIP({ xForwardedFor: true }) ?? "unknown", 20, 60);
    if (ipLimited) return ipLimited;
    const limited = await limitOrFail("chat", member.id, 8, 30);
    if (limited) return limited;

    const author = member.discord_username ?? member.roblox_username ?? "Player";
    return insertMessage(member.id, author, data.text);
  });
