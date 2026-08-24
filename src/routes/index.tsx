import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import {
  getCurrentMember,
  signOut,
  startRobloxChallenge,
  verifyRobloxChallenge,
} from "@/lib/auth.functions";
import {
  cancelCoinflip,
  createCoinflip,
  getJackpot,
  joinCoinflip,
  joinJackpot,
  listCoinflips,
  listJackpotHistory,
  listTransactions,
} from "@/lib/games.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MM2Bet — Roblox MM2 Coinflip & Jackpot Platform" },
      {
        name: "description",
        content:
          "MM2Bet: play Coinflip and Jackpot with 0% house edge, chat live, claim daily rewards and manage your token wallet with verified Discord or Roblox accounts.",
      },
      { property: "og:title", content: "MM2Bet — Roblox MM2 Coinflip & Jackpot" },
      {
        property: "og:description",
        content: "Coinflip, jackpot, rewards and a real token wallet for verified players.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type View = "home" | "jackpot" | "coinflip" | "chat" | "rewards" | "signup" | "wallet";

const TYPING_WORDS = [
  "The Best Roblox MM2 Casino",
  "Win Rare Godlies & Crypto",
  "Daily Free Rewards & Giveaways",
];

function useTypingText() {
  const [text, setText] = useState("");
  useEffect(() => {
    let cancelled = false;
    let word = 0;
    let char = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (cancelled) return;
      const full = TYPING_WORDS[word] ?? "";
      if (!deleting) {
        char += 1;
        setText(full.slice(0, char));
        if (char === full.length) {
          deleting = true;
          timer = setTimeout(tick, 2000);
          return;
        }
        timer = setTimeout(tick, 75);
      } else {
        char -= 1;
        setText(full.slice(0, char));
        if (char === 0) {
          deleting = false;
          word = (word + 1) % TYPING_WORDS.length;
          timer = setTimeout(tick, 500);
          return;
        }
        timer = setTimeout(tick, 40);
      }
    };
    timer = setTimeout(tick, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  return text;
}

function Index() {
  const [view, setView] = useState<View>("home");
  const [popupOpen, setPopupOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const typing = useTypingText();

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

  useEffect(() => {
    if (member) {
      setAuthError(null);
      setView((current) => (current === "signup" ? "home" : current));
    }
  }, [member]);

  useEffect(() => {
    if (!popupOpen) return;
    const close = () => setPopupOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [popupOpen]);

  function go(next: View) {
    setPopupOpen(false);
    setView(next);
  }

  function requireAuth(next: View) {
    setPopupOpen(false);
    setView(member ? next : "signup");
  }

  const displayName = member?.discordUsername ?? member?.robloxUsername ?? null;
  const avatar = member?.discordAvatar ?? member?.robloxAvatar ?? null;
  const balance = member?.balance ?? 0;
  const gamesActive = view === "jackpot" || view === "coinflip" || popupOpen;

  return (
    <>
      {/* Top Navbar */}
      <div className="navbar">
        <div className="nav-left">
          <div className="menu-icon">☰</div>
          <div className="logo" onClick={() => go("home")}>
            MM2<span>Bet</span>
          </div>
        </div>
        <div className="nav-right">
          <div className="balance-badge">
            <svg viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 12h.01"></path>
              <path d="M6 8h.01"></path>
            </svg>
            <span>{balance.toFixed(2)}</span>
          </div>
          {member ? (
            <div
              className="user-profile-pill"
              title="Sign out"
              onClick={async () => {
                await doSignOut();
                await queryClient.invalidateQueries();
                go("home");
              }}
            >
              {avatar ? (
                <img src={avatar} className="user-avatar-img" alt={displayName ?? "Avatar"} />
              ) : null}
              <span className="user-name-text">{displayName}</span>
            </div>
          ) : (
            <button className="auth-btn-top" onClick={() => go("signup")}>
              Sign In
            </button>
          )}
          <a
            className="discord-btn"
            href="/api/public/auth/discord"
            aria-label="Continue with Discord"
          >
            <svg viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.011c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
            </svg>
          </a>
        </div>
      </div>

      {/* HOME VIEW */}
      <div className={`view-content${view === "home" ? " active-view" : ""}`}>
        <div className="hero-banner">
          <img
            src="https://i.postimg.cc/Z5vHPHkj/1787407623818.png"
            alt="MM2Bet giveaway banner"
            className="hero-bg-img"
          />
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <h1>FREE GIVEAWAY</h1>
            <p>
              <span>{typing}</span>
              <span className="typing-cursor"></span>
            </p>
            <div className="hero-buttons">
              <button className="btn btn-primary" onClick={() => requireAuth("jackpot")}>
                Play Jackpot
              </button>
              <button className="btn btn-secondary" onClick={() => requireAuth("coinflip")}>
                Play Coinflip
              </button>
            </div>
          </div>
        </div>

        <div className="section-header">
          <div className="section-title">Current Event</div>
          <div className="section-action">View all winners &gt;</div>
        </div>

        <div className="event-card">
          <div className="event-icon">✨</div>
          <h3>No Active Event</h3>
          <p>Check back soon for the next giveaway!</p>
          <button className="btn-outline">View Previous Winners</button>
        </div>
      </div>

      {/* JACKPOT VIEW */}
      <JackpotView active={view === "jackpot"} onDeposit={() => go("wallet")} signedIn={!!member} />

      {/* COINFLIP VIEW */}
      <CoinflipView
        active={view === "coinflip"}
        memberId={member?.id ?? null}
        signedIn={!!member}
      />

      {/* CHAT VIEW */}
      <ChatView active={view === "chat"} name={displayName} />

      {/* REWARDS VIEW */}
      <div className={`view-content${view === "rewards" ? " active-view" : ""}`}>
        <div className="rewards-banner">
          <h2>Daily Rewards &amp; Promos</h2>
          <p>Complete tasks and claim free tokens every 24 hours!</p>
        </div>

        <div className="reward-card">
          <div className="rc-left">
            <div className="rc-icon">🎁</div>
            <div className="rc-info">
              <h4>Daily Bonus</h4>
              <p>Claim free tokens daily</p>
            </div>
          </div>
          <button className="btn-claim" onClick={() => requireAuth("wallet")}>
            Claim
          </button>
        </div>

        <div className="reward-card">
          <div className="rc-left">
            <div className="rc-icon">💬</div>
            <div className="rc-info">
              <h4>Discord Ranks</h4>
              <p>Join server for perks</p>
            </div>
          </div>
          <a className="btn-claim" href="/api/public/auth/discord">
            Join
          </a>
        </div>
      </div>

      {/* SIGNUP / AUTH VIEW */}
      <div className={`view-content${view === "signup" && !member ? " active-view" : ""}`}>
        <AuthCard
          authError={authError}
          onAuthenticated={async () => {
            await queryClient.invalidateQueries();
            go("home");
          }}
        />
      </div>

      {/* WALLET VIEW */}
      <WalletView active={view === "wallet"} balance={balance} />

      {/* Games Popup Menu */}
      <div className={`games-popup${popupOpen ? " show" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="game-option" onClick={() => requireAuth("coinflip")}>
          <svg className="game-icon-svg" viewBox="0 0 24 24">
            <ellipse cx="12" cy="6" rx="8" ry="3"></ellipse>
            <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"></path>
            <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"></path>
          </svg>
          <span>Coinflip</span>
        </div>
        <div className="game-option" onClick={() => requireAuth("jackpot")}>
          <svg className="game-icon-svg" viewBox="0 0 24 24">
            <path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-2-.5-3-1-4 2 1 3 3 3 5a6 6 0 1 1-12 0c0-3.5 2-6 5-11Z"></path>
          </svg>
          <span>Jackpot</span>
        </div>
        <div className="popup-footer">
          <div className="house-check">✓</div>
          <span>0% House Edge</span>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="bottom-nav">
        <button className={`nav-item${view === "home" ? " active" : ""}`} onClick={() => go("home")}>
          <svg className="home-filled" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
          Home
        </button>
        <button
          className={`nav-item${gamesActive ? " active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setPopupOpen((v) => !v);
          }}
        >
          <svg viewBox="0 0 24 24">
            <rect x="2" y="6" width="20" height="12" rx="2"></rect>
            <path d="M6 12h4m-2-2v4m10-2h.01M18 10h.01"></path>
          </svg>
          Games
        </button>
        <button className={`nav-item${view === "chat" ? " active" : ""}`} onClick={() => go("chat")}>
          <svg viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Chat
        </button>
        <button
          className={`nav-item${view === "rewards" ? " active" : ""}`}
          onClick={() => go("rewards")}
        >
          <svg viewBox="0 0 24 24">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
          </svg>
          Rewards
        </button>
        <button
          className={`nav-item${view === "wallet" ? " active" : ""}`}
          onClick={() => requireAuth("wallet")}
        >
          <svg viewBox="0 0 24 24">
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
            <path d="M4 6v12a2 2 0 0 0 2 2h14v-4"></path>
            <path d="M18 12h.01"></path>
          </svg>
          Wallet
        </button>
      </div>
    </>
  );
}

function useAction() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(
    fn: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    success: string,
  ) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else setNotice(result.message ?? success);
      await queryClient.invalidateQueries();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return { error, notice, busy, run };
}

function JackpotView({
  active,
  onDeposit,
  signedIn,
}: {
  active: boolean;
  onDeposit: () => void;
  signedIn: boolean;
}) {
  const fetchJackpotState = useServerFn(getJackpot);
  const fetchHistory = useServerFn(listJackpotHistory);
  const enter = useServerFn(joinJackpot);
  const { error, notice, busy, run } = useAction();
  const [amount, setAmount] = useState("10");
  const [tab, setTab] = useState<"current" | "history">("current");
  const [now, setNow] = useState(() => Date.now());

  const { data: jackpot } = useQuery({
    queryKey: ["jackpot"],
    queryFn: () => fetchJackpotState(),
    refetchInterval: active ? 2000 : false,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["jackpot-history"],
    queryFn: () => fetchHistory(),
    enabled: active && tab === "history",
  });

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const entries = jackpot?.entries ?? [];
  const total = jackpot?.total ?? 0;
  const players = jackpot?.playerCount ?? 0;
  const endsIn = jackpot?.endsAt
    ? Math.max(0, Math.round((new Date(jackpot.endsAt).getTime() - now) / 1000))
    : null;
  const progress = endsIn !== null ? Math.max(0, Math.min(1, endsIn / 60)) : Math.min(1, players / 2);

  return (
    <div className={`view-content${active ? " active-view" : ""}`}>
      <div className="game-top-header">
        <div className="game-title-group">
          <div className="game-icon-badge">
            <svg viewBox="0 0 24 24">
              <path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-2-.5-3-1-4 2 1 3 3 3 5a6 6 0 1 1-12 0c0-3.5 2-6 5-11Z"></path>
            </svg>
          </div>
          <div>
            <h2>Jackpot</h2>
            <p>Round #{jackpot?.roundNumber ?? "—"}</p>
          </div>
        </div>
        <button className="btn-deposit-top" onClick={onDeposit}>
          + Deposit
        </button>
      </div>

      <div className="game-tabs">
        <button
          className={`game-tab${tab === "current" ? " active" : ""}`}
          onClick={() => setTab("current")}
        >
          <svg viewBox="0 0 24 24">
            <path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-2-.5-3-1-4 2 1 3 3 3 5a6 6 0 1 1-12 0c0-3.5 2-6 5-11Z"></path>
          </svg>
          Current Round
        </button>
        <button
          className={`game-tab${tab === "history" ? " active" : ""}`}
          onClick={() => setTab("history")}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          History
        </button>
      </div>

      {tab === "history" ? (
        history.length === 0 ? (
          <div className="empty-lobby">No completed rounds yet.</div>
        ) : (
          <div className="data-card">
            {history.map((round) => (
              <div key={round.id} className="data-row">
                <span className="data-name">Round #{round.roundNumber}</span>
                <span className="data-meta">
                  {round.winner} won {round.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
      <>
      <div className="jackpot-arena">
        <div className="jackpot-wheel-container">
          <div className="wheel-pointer"></div>
          <svg className="wheel-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#232838" strokeWidth="8"></circle>
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="#f39c12"
              strokeWidth="8"
              strokeDasharray="276"
              strokeDashoffset={276 - 276 * progress}
            ></circle>
          </svg>
          <div className="wheel-center-text">
            <div className="wheel-center-num">{total.toFixed(2)}</div>
            <div className="wheel-center-lbl">TOKENS</div>
          </div>
        </div>
        <div className="jackpot-status">
          {endsIn !== null
            ? endsIn > 0
              ? `Drawing in ${endsIn}s`
              : "Drawing winner…"
            : `Waiting for players (${players}/2 minimum)`}
        </div>
        {error ? <div className="auth-error">{error}</div> : null}
        {notice ? <div className="auth-success">{notice}</div> : null}
        {signedIn ? (
          <div className="stake-row">
            <input
              className="auth-input"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Entry amount"
            />
            <button
              className="mini-btn"
              disabled={busy || !(Number(amount) > 0)}
              onClick={() =>
                void run(() => enter({ data: { amount: Number(amount) } }), "Entry added.")
              }
            >
              Join
            </button>
          </div>
        ) : (
          <button className="btn-jp-deposit" onClick={onDeposit}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Deposit Tokens
          </button>
        )}
      </div>

      {entries.length > 0 ? (
        <div className="data-card">
          {entries.map((entry) => (
            <div key={entry.id} className="data-row">
              <span className="data-name">{entry.name}</span>
              <span>
                {entry.amount.toFixed(2)} ·{" "}
                {total > 0 ? `${Math.round((entry.amount / total) * 100)}%` : "0%"}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {jackpot?.lastWinner ? (
        <div className="data-card">
          <div className="data-row">
            <span className="data-name">Last round winner</span>
            <span>
              {jackpot.lastWinner.name} · {jackpot.lastWinner.total.toFixed(2)}
            </span>
          </div>
        </div>
      ) : null}
      </>
      )}
    </div>
  );
}

function CoinflipView({
  active,
  memberId,
  signedIn,
}: {
  active: boolean;
  memberId: string | null;
  signedIn: boolean;
}) {
  const fetchFlips = useServerFn(listCoinflips);
  const create = useServerFn(createCoinflip);
  const join = useServerFn(joinCoinflip);
  const cancel = useServerFn(cancelCoinflip);
  const { error, notice, busy, run } = useAction();

  const [amount, setAmount] = useState("10");
  const [side, setSide] = useState<"heads" | "tails">("heads");
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"open" | "history">("open");

  const { data: allFlips = [] } = useQuery({
    queryKey: ["coinflips"],
    queryFn: () => fetchFlips(),
    refetchInterval: active ? 2000 : false,
  });

  const flips = allFlips.filter((flip) =>
    tab === "open" ? flip.status === "open" : flip.status !== "open",
  );

  return (
    <div className={`view-content${active ? " active-view" : ""}`}>
      <div className="game-top-header">
        <div className="game-title-group">
          <div className="game-icon-badge">
            <svg viewBox="0 0 24 24">
              <ellipse cx="12" cy="6" rx="8" ry="3"></ellipse>
              <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"></path>
              <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"></path>
            </svg>
          </div>
          <div>
            <h2>Coinflip</h2>
            <p>Flip a coin against another player</p>
          </div>
        </div>
        <button className="btn-deposit-top" onClick={() => setShowCreate((v) => !v)}>
          + Create
        </button>
      </div>

      <div className="game-tabs">
        <button
          className={`game-tab${tab === "open" ? " active" : ""}`}
          onClick={() => setTab("open")}
        >
          <svg viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Open Games
        </button>
        <button
          className={`game-tab${tab === "history" ? " active" : ""}`}
          onClick={() => setTab("history")}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          History
        </button>
      </div>

      {error ? <div className="auth-error">{error}</div> : null}
      {notice ? <div className="auth-success">{notice}</div> : null}

      {showCreate && signedIn ? (
        <div className="data-card">
          <div className="stake-row">
            <input
              className="auth-input"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Stake"
            />
            <div className="side-toggle">
              <button
                className={`side-btn${side === "heads" ? " active" : ""}`}
                onClick={() => setSide("heads")}
              >
                Heads
              </button>
              <button
                className={`side-btn${side === "tails" ? " active" : ""}`}
                onClick={() => setSide("tails")}
              >
                Tails
              </button>
            </div>
          </div>
          <button
            className="btn-auth-submit"
            disabled={busy || !(Number(amount) > 0)}
            onClick={() =>
              void run(() => create({ data: { amount: Number(amount), side } }), "Flip created.")
            }
          >
            {busy ? "Working…" : "Create Flip"}
          </button>
        </div>
      ) : null}

      {flips.length === 0 ? (
        <div className="empty-lobby">
          {tab === "open"
            ? "No active coinflip games found. Create one or deposit to start playing!"
            : "No finished coinflips yet."}
        </div>
      ) : (
        <div className="data-card">
          {flips.map((flip) => (
            <div key={flip.id} className="data-row">
              <span className="data-name">{flip.creator.name}</span>
              <span className="data-meta">
                {flip.amount.toFixed(2)} · {flip.creatorSide}
                {flip.status === "settled"
                  ? ` · ${flip.result} → ${
                      flip.winnerId === flip.creator.id
                        ? flip.creator.name
                        : (flip.joiner?.name ?? "joiner")
                    }`
                  : flip.status === "cancelled"
                    ? " · cancelled"
                    : ""}
              </span>
              {flip.status === "open" ? (
                flip.creator.id === memberId ? (
                  <button
                    className="mini-btn ghost"
                    disabled={busy}
                    onClick={() =>
                      void run(() => cancel({ data: { id: flip.id } }), "Flip cancelled.")
                    }
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    className="mini-btn"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const result = await join({ data: { id: flip.id } });
                        if (!result.ok) return result;
                        return {
                          ok: true,
                          message: `Coin landed ${"result" in result ? result.result : ""} — you ${
                            "won" in result && result.won ? "won!" : "lost."
                          }`,
                        };
                      }, "Flip settled.")
                    }
                  >
                    Join
                  </button>
                )
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ChatMessage = { id: number; author: string; text: string; time: string };

function ChatView({ active, name }: { active: boolean; name: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      author: "System",
      text: "Welcome to MM2Bet Global Chat! Be respectful.",
      time: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: prev.length, author: name ?? "You", text, time: "Just now" },
    ]);
    setInput("");
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }

  return (
    <div className={`view-content${active ? " active-view" : ""}`}>
      <div className="chat-container">
        <div className="chat-header-bar">
          <div className="chat-room-info">
            <div className="online-indicator"></div>
            <span>Global Chat Room</span>
          </div>
        </div>
        <div className="chat-messages" ref={listRef}>
          {messages.map((msg) => (
            <div key={msg.id} className="chat-msg">
              <span className="author">{msg.author}:</span>
              {msg.text}
              <span className="time">{msg.time}</span>
            </div>
          ))}
        </div>
        <div className="chat-input-bar">
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button className="chat-send-btn" onClick={send}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletView({ active, balance }: { active: boolean; balance: number }) {
  const fetchTx = useServerFn(listTransactions);
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchTx(),
    refetchInterval: 10000,
  });

  return (
    <div className={`view-content${active ? " active-view" : ""}`}>
      <div className="wallet-header">
        <div className="wallet-icon-box">
          <svg viewBox="0 0 24 24">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 12h.01"></path>
            <path d="M6 8h.01"></path>
          </svg>
        </div>
        <div className="wallet-title-area">
          <h2>Wallet</h2>
        </div>
      </div>
      <p className="wallet-subtitle">Manage your balance and withdraw your winnings.</p>

      <div className="wallet-balance-card">
        <div className="wallet-balance-label">Available Balance</div>
        <div className="wallet-balance-amount">
          <span>{balance.toFixed(2)}</span> <span>tokens</span>
        </div>
        <div className="wallet-usd-val">≈ ${(balance * 0.01).toFixed(2)} USD</div>

        <div className="wallet-actions">
          <button className="btn-deposit">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
            Deposit
          </button>
          <button className="btn-withdraw">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            Withdraw
          </button>
        </div>

        <svg
          className="wallet-bg-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 12h.01"></path>
          <path d="M6 8h.01"></path>
        </svg>
      </div>

      <div className="wallet-menu-card">
        <div className="wm-icon tips">
          <svg viewBox="0 0 24 24">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
        </div>
        <div className="wm-info">
          <h4>Tips History</h4>
          <p>View sent &amp; received</p>
        </div>
      </div>

      <div className="wallet-menu-card">
        <div className="wm-icon winnings">
          <svg viewBox="0 0 24 24">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
          </svg>
        </div>
        <div className="wm-info">
          <h4>Winnings</h4>
          <p>View giveaway prizes</p>
        </div>
      </div>

      <div className="wallet-menu-card">
        <div className="wm-icon history">
          <svg viewBox="0 0 24 24">
            <rect x="2" y="6" width="20" height="12" rx="2"></rect>
            <path d="M6 12h4m-2-2v4m10-2h.01M18 10h.01"></path>
          </svg>
        </div>
        <div className="wm-info">
          <h4>Game History</h4>
          <p>View PVP games</p>
        </div>
      </div>

      <div className="wallet-section-header">Recent Transactions</div>
      <div className="data-card">
        {transactions.length === 0 ? (
          <div className="data-row">
            <span className="data-meta">No transactions yet.</span>
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="data-row">
              <span className="data-name">{tx.kind.replace(/_/g, " ")}</span>
              <span className="data-meta">{new Date(tx.createdAt).toLocaleString()}</span>
              <span className={tx.amount >= 0 ? "amount-up" : "amount-down"}>
                {tx.amount >= 0 ? "+" : ""}
                {tx.amount.toFixed(2)}
              </span>
            </div>
          ))
        )}
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
      <h2>Sign In / Register</h2>
      <p>Connect your account to save balances and start playing</p>

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
      <p style={{ fontSize: 11, color: "#6b7280", marginTop: 10 }}>
        By continuing, you agree to site terms and 0% house edge conditions.
      </p>
    </div>
  );
}
