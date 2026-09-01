import { Link } from "react-router-dom";

/**
 * Compact, uniform-height leaderboard card/row component.
 */
export default function LeaderBoardCard({ entry, mineId, scope, value, badgeIcon = "🔥" }) {
  if (!entry) return null;

  const isMine = entry.userId === mineId;
  const isTopThree = entry.rank <= 3;

  const rankColors = entry.rank === 1
    ? "text-amber-400 font-black"
    : entry.rank === 2
    ? "text-slate-300 font-black"
    : entry.rank === 3
    ? "text-amber-600 font-black"
    : "text-slate-400 font-bold";

  const displayValue = typeof value === "function" ? value(entry) : value || `${entry.streak?.current || 0} days`;

  return (
    <Link
      to={isMine ? "/profile" : `/profile/${entry.userId}`}
      state={scope ? { fromLeaderboard: scope } : undefined}
      className={`group flex h-16 items-center justify-between gap-3 rounded-xl border px-3.5 sm:px-4 transition-all duration-200 ${
        isMine
          ? "border-orange-500/70 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.1)] hover:bg-orange-500/15"
          : isTopThree
          ? "border-white/15 bg-[#141d2e] hover:border-orange-400/40 hover:bg-[#182337]"
          : "border-white/10 bg-[#111927] hover:border-white/20 hover:bg-[#152032]"
      }`}
    >
      {/* Left: Rank & Avatar */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className={`w-6 sm:w-7 text-center text-sm sm:text-base ${rankColors}`}>
          #{entry.rank}
        </span>

        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-[#1b273d] text-sm font-black text-white group-hover:border-orange-400 transition">
          {entry.avatar ? (
            <img src={entry.avatar} alt={entry.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-orange-400">{entry.name?.slice(0, 1).toUpperCase()}</span>
          )}
        </div>

        {/* Center: Name & College */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs sm:text-sm font-extrabold text-white group-hover:text-orange-300 transition">
              {entry.name}
            </p>
            {isMine && (
              <span className="shrink-0 rounded bg-orange-500/20 px-1.5 py-0.2 text-[10px] font-black text-orange-300">
                You
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-slate-400">
            {entry.college?.name || "College not listed"}
            {entry.branch ? ` · ${entry.branch}` : ""}
          </p>
        </div>
      </div>

      {/* Right: Metric badge */}
      <div className="shrink-0 text-right pl-2">
        <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-black text-orange-200">
          {displayValue}
        </span>
      </div>
    </Link>
  );
}
