import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  createdAt: string;
};

export const getAnnouncement = createServerFn({ method: "GET" }).handler(
  async (): Promise<Announcement | null> => {
    const { fetchActiveAnnouncement } = await import("./announcements.server");
    return fetchActiveAnnouncement();
  },
);

export const adminListAnnouncements = createServerFn({ method: "GET" }).handler(
  async (): Promise<Announcement[]> => {
    const { memberFromCookieHeader } = await import("./session.server");
    const { memberIsAdmin } = await import("./admin.server");
    const { fetchAllAnnouncements } = await import("./announcements.server");
    const member = await memberFromCookieHeader(getRequestHeader("cookie") ?? null);
    if (!member || !(await memberIsAdmin(member.id))) return [];
    return fetchAllAnnouncements();
  },
);

export const adminPublishAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ title: z.string().min(2).max(80), body: z.string().min(2).max(500) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { memberFromCookieHeader } = await import("./session.server");
    const { memberIsAdmin } = await import("./admin.server");
    const { createAnnouncement } = await import("./announcements.server");
    const { limitOrFail } = await import("./rate-limit.server");

    const member = await memberFromCookieHeader(getRequestHeader("cookie") ?? null);
    if (!member || !(await memberIsAdmin(member.id))) {
      return { ok: false as const, error: "Admins only." };
    }
    const limited = await limitOrFail("announce", member.id, 5, 60);
    if (limited) return limited;
    return createAnnouncement(member.id, data.title.trim(), data.body.trim());
  });

export const adminHideAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { memberFromCookieHeader } = await import("./session.server");
    const { memberIsAdmin } = await import("./admin.server");
    const { deactivateAnnouncement } = await import("./announcements.server");
    const member = await memberFromCookieHeader(getRequestHeader("cookie") ?? null);
    if (!member || !(await memberIsAdmin(member.id))) {
      return { ok: false as const, error: "Admins only." };
    }
    return deactivateAnnouncement(data.id);
  });
