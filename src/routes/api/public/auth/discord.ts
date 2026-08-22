import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/auth/discord")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env["DISCORD_CLIENT_ID"];
        if (!clientId) {
          return new Response("Discord login is not configured yet.", { status: 503 });
        }
        const origin = new URL(request.url).origin;
        const redirectUri = `${origin}/api/public/auth/discord/callback`;
        const url = new URL("https://discord.com/api/oauth2/authorize");
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("redirect_uri", redirectUri);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", "identify");
        url.searchParams.set("prompt", "consent");
        return Response.redirect(url.toString(), 302);
      },
    },
  },
});
