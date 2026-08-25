export function CoinAnimation({
  spinning,
  result,
}: {
  spinning: boolean;
  result: "heads" | "tails" | null;
}) {
  const state = spinning ? "spin" : result ? `land-${result}` : "idle";
  return (
    <div className="coin-stage">
      <div className={`coin3d coin-${state}`}>
        <div className="coin-face coin-heads">
          <span>H</span>
        </div>
        <div className="coin-face coin-tails">
          <span>T</span>
        </div>
        <div className="coin-edge"></div>
      </div>
      <div className="coin-shadow"></div>
    </div>
  );
}
