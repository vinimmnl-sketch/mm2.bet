import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  getCurrentMember,
  signOut,
  startRobloxChallenge,
  verifyRobloxChallenge,
} from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MM2Bet — Live MM2 Platform with Verified Accounts" },
      {
        name: "description",
        content:
          "Link your Discord or verify Roblox ownership to access the MM2Bet live platform. Real OAuth, real Roblox bio verification, no demo data.",
      },
      { property: "og:title", content: "MM2Bet — Live MM2 Platform" },
      {
        property: "og:description",
        content: "Connect with Discord or verify your Roblox profile to join the MM2Bet platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type View = "home" | "signup";

function Index() {
  const [view, setView] = useState<View>("home");
  const [authError, setAuthError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const fetchMember = useServerFn(getCurrentMember);
  const doSignOut = useServerFn(signOut);

  const { data: member } = useQuery({
    queryKey: ["member"],
    queryFn: () => fetchMember(),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("auth_error");
    if (error) {
      setAuthError(error);
      setView("signup");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const displayName = member?.discordUsername ?? member?.robloxUsername ?? null;
  const avatar = member?.discordAvatar ?? member?.robloxAvatar ?? null;

  return (
    <div className="mm2">
      <div className="navbar">
        <div className="nav-left">
          <div className="logo" onClick={() => setView("home")}>
            MM2<span>Bet</span>
          </div>
        </div>
        <div className="nav-right">
          <div className="balance-badge">
            <svg viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{(member?.balance ?? 0).toFixed(2)}</span>
          </div>
          {member ? (
            <div
              className="user-profile-pill"
              onClick={async () => {
                await doSignOut();
                await queryClient.invalidateQueries({ queryKey: ["member"] });
              }}
              title="Sign out"
            >
              {avatar ? <img src={avatar} className="user-avatar-img" alt={displayName ?? ""} /> : null}
              <span className="user-name-text">{displayName}</span>
            </div>
          ) : (
            <button className="auth-btn-top" onClick={() => setView("signup")}>
              Sign In
            </button>
          )}
        </div>
      </div>

      {view === "home" ? (
        <div className="view-content">
          <div className="hero-banner">
            <img
              src="https://i.postimg.cc/Z5vHPHkj/1787407623818.png"
              alt="MM2Bet platform banner"
              className="hero-bg-img"
            />
            <div className="hero-overlay" />
            <div className="hero-content">
              <h1>LIVE MM2 PLATFORM</h1>
              <p>Verified accounts only — Discord OAuth and Roblox ownership checks</p>
              <div>
                <button className="btn btn-primary" onClick={() => setView("signup")}>
                  {member ? "Manage Account" : "Connect Account"}
                </button>
              </div>
            </div>
          </div>

          <div className="section-header">
            <div className="section-title">Your Account</div>
          </div>
          <div className="live-feed-card">
            {member ? (
              <>
                <div className="feed-item">
                  <span className="feed-user">Discord</span>
                  <span>{member.discordUsername ?? "Not linked"}</span>
                </div>
                <div className="feed-item">
                  <span className="feed-user">Roblox</span>
                  <span>{member.robloxUsername ?? "Not verified"}</span>
                </div>
                <div className="feed-item">
                  <span className="feed-user">Balance</span>
                  <span>{member.balance.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="feed-empty">Sign in to see your linked accounts and balance.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="view-content">
          <AuthCard
            authError={authError}
            onAuthenticated={async () => {
              await queryClient.invalidateQueries({ queryKey: ["member"] });
              setView("home");
            }}
          />
        </div>
      )}

      <div className="bottom-nav">
        <button
          className={`nav-item${view === "home" ? " active" : ""}`}
          onClick={() => setView("home")}
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          Home
        </button>
        <button
          className={`nav-item${view === "signup" ? " active" : ""}`}
          onClick={() => setView("signup")}
        >
          <svg viewBox="0 0 24 24">
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
            <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
          </svg>
          Account
        </button>
      </div>
    </div>
  );
}

function AuthCard({
  authError,
  onAuthenticated,
}: {
  authError: string | null;
  onAuthenticated: () => void | Promise<void>;
}) {
  const start = useServerFn(startRobloxChallenge);
  const verify = useServerFn(verifyRobloxChallenge);

  const [username, setUsername] = useState("");
  const [challenge, setChallenge] = useState<{ code: string; token: string; name: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(authError);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setError(authError), [authError]);

  async function handleStart() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await start({ data: { username: username.trim() } });
      if (!result.ok) setError(result.error);
      else setChallenge({ code: result.code, token: result.challenge, name: result.robloxUsername });
    } catch {
      setError("Could not reach Roblox. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!challenge) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await verify({ data: { challenge: challenge.token } });
      if (!result.ok) setError(result.error);
      else {
        setNotice("Roblox ownership verified.");
        await onAuthenticated();
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <h2>Live Authentication</h2>
      <p>Link via official OAuth2 or verified Roblox profile ownership</p>

      {error ? <div className="auth-error">{error}</div> : null}
      {notice ? <div className="auth-success">{notice}</div> : null}

      <a className="btn-discord-login" href="/api/public/auth/discord">
        <svg viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.011c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
        </svg>
        Continue with Discord
      </a>

      <div className="auth-divider">or verify Roblox ownership</div>

      {!challenge ? (
        <>
          <input
            type="text"
            className="auth-input"
            placeholder="Enter Roblox username"
            value={username}
            autoComplete="off"
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && username.trim().length >= 3) void handleStart();
            }}
          />
          <button
            className="btn-auth-submit"
            disabled={busy || username.trim().length < 3}
            onClick={() => void handleStart()}
          >
            {busy ? "Checking Roblox…" : "Generate Bio Challenge"}
          </button>
        </>
      ) : (
        <>
          <p className="auth-hint">
            Verifying <strong>{challenge.name}</strong>. Paste this exact code into your Roblox
            profile description (About), save it, then verify. The code expires in 15 minutes.
          </p>
          <div className="verification-code-box">{challenge.code}</div>
          <button className="btn-auth-submit" disabled={busy} onClick={() => void handleVerify()}>
            {busy ? "Reading your profile…" : "Verify Bio & Link Account"}
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              setChallenge(null);
              setError(null);
            }}
          >
            Use a different username
          </button>
        </>
      )}
    </div>
  );
}
