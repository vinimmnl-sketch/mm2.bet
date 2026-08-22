import { createFileRoute } from "@tanstack/react-router";

import { createSessionCookie } from "@/lib/session.server";

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  discriminator?: string;
};

function fail(origin: string, reason: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}/?auth_error=${encodeURIComponent(reason)}` },
  });
}

export const Route = createFileRoute("/api/public/auth/discord/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        if (url.searchParams.get("error")) return fail(origin, "Discord login was cancelled.");
        if (!code) return fail(origin, "Missing Discord authorization code.");

        const clientId = process.env["DISCORD_CLIENT_ID"];
        const clientSecret = process.env["DISCORD_CLIENT_SECRET"];
        if (!clientId || !clientSecret) return fail(origin, "Discord login is not configured.");

        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: `${origin}/api/public/auth/discord/callback`,
          }),
        });
        if (!tokenRes.ok) {
          console.error("Discord token exchange failed", await tokenRes.text());
          return fail(origin, "Discord rejected the login. Check the app credentials.");
        }
        const token = (await tokenRes.json()) as { access_token?: string };
        if (!token.access_token) return fail(origin, "Discord did not return an access token.");

        const userRes = await fetch("https://discord.com/api/users/@me", {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        if (!userRes.ok) return fail(origin, "Could not read your Discord profile.");
        const user = (await userRes.json()) as DiscordUser;

        const avatar = user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
          : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: member, error } = await supabaseAdmin
          .from("members")
          .upsert(
            {
              discord_id: user.id,
              discord_username: user.global_name || user.username,
              discord_avatar: avatar,
            },
            { onConflict: "discord_id" },
          )
          .select("id")
          .single();

        if (error || !member) {
          console.error("Failed to store Discord member", error);
          return fail(origin, "Could not save your account.");
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: `${origin}/`,
            "Set-Cookie": await createSessionCookie(member.id),
          },
        });
      },
    },
  },
});
