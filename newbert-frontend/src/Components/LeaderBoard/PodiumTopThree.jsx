import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";

/**
 * Animated 2-1-3 Podium for Top 3 Leaderboard Winners
 * Built entirely with React, Tailwind CSS, and Framer Motion. Zero external image assets.
 */
export default function PodiumTopThree({ users = [], mineId, scope, metricType = "streak", metricLabel }) {
  if (!users || users.length === 0) return null;

  // Reorder top 3 users into [2nd, 1st, 3rd] layout
  const rank1 = users.find((u) => u.rank === 1) || users[0];
  const rank2 = users.find((u) => u.rank === 2) || users[1];
  const rank3 = users.find((u) => u.rank === 3) || users[2];

  const podiumSlots = [
    { rank: 2, user: rank2, heightClass: "h-[140px] sm:h-[185px]" },
    { rank: 1, user: rank1, heightClass: "h-[176px] sm:h-[240px]" },
    { rank: 3, user: rank3, heightClass: "h-[120px] sm:h-[155px]" },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0e1626] p-4 sm:p-7 shadow-2xl">
      <div className="relative z-10 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
          🏆 Top Performers
        </p>
        <h2 className="mt-1 text-xl sm:text-2xl font-black text-white">
          Leading the Pack
        </h2>
      </div>

      <div className="relative z-10 mt-8 flex items-end justify-center gap-2 sm:gap-4 md:gap-6 min-h-[320px] sm:min-h-[380px] pb-2">
        {podiumSlots.map((slot) => (
          <PodiumColumn
            key={slot.rank}
            slot={slot}
            mineId={mineId}
            scope={scope}
            metricType={metricType}
            metricLabel={metricLabel}
          />
        ))}
      </div>
    </section>
  );
}

function PodiumColumn({ slot, mineId, scope, metricType, metricLabel }) {
  const { rank, user, heightClass } = slot;
  if (!user) {
    return <div className="w-24 sm:w-36 md:w-44 shrink-0 opacity-20" />;
  }

  const isMine = user.userId === mineId;
  const isRank1 = rank === 1;
  const isRank2 = rank === 2;

  // Stagger delays: #1 first (0.1s), then #2 (0.25s), then #3 (0.4s)
  const delay = isRank1 ? 0.05 : isRank2 ? 0.2 : 0.35;

  // Styling by rank
  const badgeColors = isRank1
    ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 ring-4 ring-amber-400/30"
    : isRank2
    ? "bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 ring-4 ring-slate-300/20"
    : "bg-gradient-to-r from-amber-700 to-orange-800 text-amber-100 ring-4 ring-amber-700/20";

  const pillarGradients = isRank1
    ? "from-orange-500/25 via-amber-500/15 to-[#131d31] border-t-2 border-orange-400/80 shadow-[0_-8px_30px_rgba(249,115,22,0.18)]"
    : isRank2
    ? "from-slate-400/20 via-slate-600/10 to-[#131d31] border-t-2 border-slate-300/60 shadow-[0_-8px_20px_rgba(148,163,184,0.1)]"
    : "from-amber-800/20 via-amber-900/10 to-[#131d31] border-t-2 border-amber-600/50 shadow-[0_-8px_20px_rgba(180,83,9,0.1)]";

  const avatarBorder = isRank1
    ? "border-amber-400 ring-4 ring-amber-400/30 shadow-[0_0_20px_rgba(251,191,36,0.35)]"
    : isRank2
    ? "border-slate-300 ring-2 ring-slate-300/20"
    : "border-amber-600 ring-2 ring-amber-600/20";

  const scoreText = metricLabel ? metricLabel(user) : formatDefaultMetric(user, metricType);

  return (
    <div className="flex w-28 sm:w-40 md:w-52 flex-col items-center justify-end text-center">
      {/* Top User Info & Avatar */}
      <Motion.div
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, delay: delay + 0.15, ease: "easeOut" }}
        className="z-10 -mb-5 flex w-full flex-col items-center"
      >
        {/* Crown for #1 */}
        {isRank1 && (
          <Motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
            className="mb-1 text-2xl filter drop-shadow-md select-none"
            aria-hidden="true"
          >
            👑
          </Motion.div>
        )}

        {/* Avatar with Floating Rank Badge */}
        <Link
          to={isMine ? "/profile" : `/profile/${user.userId}`}
          state={scope ? { fromLeaderboard: scope } : undefined}
          className="group relative block focus:outline-none"
        >
          <div
            className={`grid h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 place-items-center overflow-hidden rounded-full border-2 sm:border-[3px] bg-[#1a2438] font-black text-white transition-transform duration-300 group-hover:scale-105 ${avatarBorder}`}
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl sm:text-2xl font-black text-orange-400">
                {user.name?.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Rank Badge */}
          <div
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs font-black shadow-lg ${badgeColors}`}
          >
            #{rank}
          </div>
        </Link>

        {/* Name & College */}
        <div className="mt-3.5 w-full px-1">
          <Link
            to={isMine ? "/profile" : `/profile/${user.userId}`}
            state={scope ? { fromLeaderboard: scope } : undefined}
            className="block truncate text-xs sm:text-sm font-extrabold text-white hover:text-orange-400 transition"
            title={user.name}
          >
            {user.name}
            {isMine && <span className="ml-1 text-[10px] text-orange-400">· You</span>}
          </Link>
          <p className="truncate text-[10px] sm:text-xs text-slate-400 mt-0.5" title={user.college?.name}>
            {user.college?.name || "College not listed"}
          </p>
        </div>

        {/* Score pill */}
        <div className="mt-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] sm:text-xs font-black text-orange-300 whitespace-nowrap">
          {scoreText}
        </div>
      </Motion.div>

      {/* Animated Podium Pillar */}
      <Motion.div
        initial={{ scaleY: 0, opacity: 0.5 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "bottom" }}
        className={`w-full ${heightClass} rounded-t-lg bg-gradient-to-b ${pillarGradients} flex flex-col items-center justify-start pt-8 border-x border-white/5`}
      >
        <span
          className={`text-3xl sm:text-4xl md:text-5xl font-black opacity-30 select-none ${
            isRank1 ? "text-amber-400 opacity-40" : isRank2 ? "text-slate-300 opacity-30" : "text-amber-600 opacity-30"
          }`}
        >
          {rank}
        </span>
      </Motion.div>
    </div>
  );
}

function formatDefaultMetric(user, metricType) {
  if (metricType === "streak") {
    return `🔥 ${user.streak?.current || 0} days`;
  }
  if (metricType === "longest_streak") {
    return `🔥 ${user.streak?.longest || 0} days`;
  }
  if (metricType === "leetcode") {
    return `⚡ ${user.leetcode?.totalSolved || user.leetcode?.today || 0} solved`;
  }
  if (metricType === "github") {
    return `💻 ${user.github?.totalContributions || user.github?.today || 0} activities`;
  }
  return `⭐ ${user.overallScore || 0} pts`;
}
