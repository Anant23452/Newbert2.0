import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";

/**
 * Animated 2-1-3 Podium for Top 3 Leaderboard Winners
 * Built strictly with React, Tailwind CSS, and Framer Motion. Zero external image assets.
 * Physical height animation from 0 -> final height (#1: 240px, #2: 185px, #3: 155px).
 */
export default function PodiumTopThree({ users = [], mineId, scope, metricType = "streak", metricLabel }) {
  if (!users || users.length === 0) return null;

  // Reorder top 3 users into [2nd, 1st, 3rd] layout
  const rank1 = users.find((u) => u.rank === 1) || users[0];
  const rank2 = users.find((u) => u.rank === 2) || (users[1] !== rank1 ? users[1] : undefined);
  const rank3 = users.find((u) => u.rank === 3) || (users[2] !== rank1 && users[2] !== rank2 ? users[2] : undefined);

  const podiumSlots = [
    { rank: 2, user: rank2, desktopHeight: 185, mobileHeight: 145, order: "order-1" },
    { rank: 1, user: rank1, desktopHeight: 240, mobileHeight: 190, order: "order-2" },
    { rank: 3, user: rank3, desktopHeight: 155, mobileHeight: 120, order: "order-3" },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0e1626] p-4 sm:p-7 shadow-2xl">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-48 w-80 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-32 w-full max-w-xl bg-amber-500/5 blur-2xl" />

      <div className="relative z-10 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
          🏆 Top Performers
        </p>
        <h2 className="mt-1 text-xl sm:text-2xl font-black text-white">
          Leading the Pack
        </h2>
      </div>

      <div className="relative z-10 mt-8 flex items-end justify-center gap-2.5 sm:gap-4 md:gap-6 min-h-[340px] sm:min-h-[400px] pb-2">
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
  const { rank, user, desktopHeight, mobileHeight, order } = slot;
  const isMine = user?.userId === mineId;
  const isRank1 = rank === 1;
  const isRank2 = rank === 2;

  // Stagger delays: #1 first (0.05s), then #2 (0.22s), then #3 (0.38s)
  const delay = isRank1 ? 0.05 : isRank2 ? 0.22 : 0.38;

  // Rank styling
  const badgeColors = isRank1
    ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 ring-4 ring-amber-400/30"
    : isRank2
    ? "bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 ring-4 ring-slate-300/20"
    : "bg-gradient-to-r from-amber-700 to-orange-800 text-amber-100 ring-4 ring-amber-700/20";

  const pillarGradients = isRank1
    ? "from-orange-500/30 via-amber-500/15 to-[#111927] border-t-2 border-orange-400/90 shadow-[0_-8px_30px_rgba(249,115,22,0.22)]"
    : isRank2
    ? "from-slate-300/20 via-slate-500/10 to-[#111927] border-t-2 border-slate-300/70 shadow-[0_-8px_20px_rgba(148,163,184,0.12)]"
    : "from-amber-800/25 via-amber-900/10 to-[#111927] border-t-2 border-amber-600/60 shadow-[0_-8px_20px_rgba(180,83,9,0.12)]";

  const avatarBorder = isRank1
    ? "border-amber-400 ring-4 ring-amber-400/35 shadow-[0_0_24px_rgba(251,191,36,0.4)]"
    : isRank2
    ? "border-slate-300 ring-2 ring-slate-300/25"
    : "border-amber-600 ring-2 ring-amber-600/25";

  // Target numeric value for count-up animation
  const numericValue = getNumericMetric(user, metricType);
  const metricPrefix = metricType === "streak" || metricType === "longest_streak" ? "🔥" : metricType === "leetcode" ? "⚡" : metricType === "github" ? "💻" : "⭐";
  const metricSuffix = metricType === "streak" || metricType === "longest_streak" ? "days" : metricType === "leetcode" ? "solved" : metricType === "github" ? "acts" : "pts";

  // If slot has no user (e.g. only 1 or 2 students on leaderboard)
  if (!user) {
    return (
      <div className={`flex w-24 sm:w-36 md:w-48 flex-col items-center justify-end text-center ${order}`}>
        <div className="mb-4 flex flex-col items-center opacity-30">
          <div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-full border-2 border-dashed border-white/20 bg-white/5 text-xs text-slate-400 font-bold">
            #{rank}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Awaiting leader</p>
        </div>
        <div
          style={{ height: `${desktopHeight * 0.75}px` }}
          className="w-full rounded-t-lg border-x border-t border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center"
        >
          <span className="text-2xl font-black text-white/10">#{rank}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-28 sm:w-40 md:w-52 flex-col items-center justify-end text-center ${order}`}>
      {/* Top User Info & Avatar */}
      <Motion.div
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: delay + 0.1, ease: "easeOut" }}
        className="z-10 -mb-4 flex w-full flex-col items-center"
      >
        {/* Animated Crown for #1 */}
        {isRank1 && (
          <Motion.div
            initial={{ scale: 0, y: 10, rotate: -20 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 12, delay: 0.25 }}
            className="mb-1 text-2xl sm:text-3xl filter drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)] select-none"
            aria-hidden="true"
          >
            👑
          </Motion.div>
        )}

        {/* Avatar with Rank Badge */}
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

          {/* Floating Rank Medal */}
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
            {isMine && <span className="ml-1 text-[10px] font-black text-orange-400">· You</span>}
          </Link>
          <p className="truncate text-[10px] sm:text-xs text-slate-400 mt-0.5" title={user.college?.name}>
            {user.college?.name || "College not listed"}
          </p>
        </div>

        {/* Score Pill with Animated Counter */}
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] sm:text-xs font-black text-orange-300 whitespace-nowrap shadow-sm">
          <span>{metricPrefix}</span>
          <AnimatedNumber value={numericValue} />
          <span className="text-[10px] opacity-80">{metricSuffix}</span>
        </div>
      </Motion.div>

      {/* Animated Podium Pillar: physical height 0 -> final height */}
      <Motion.div
        initial={{ height: 0, opacity: 0.3 }}
        animate={{ height: desktopHeight, opacity: 1 }}
        transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full rounded-t-xl bg-gradient-to-b ${pillarGradients} flex flex-col items-center justify-start pt-7 border-x border-white/5 relative overflow-hidden`}
      >
        {/* Subtle pillar lighting stripe */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/25" />

        <span
          className={`text-3xl sm:text-4xl md:text-5xl font-black select-none ${
            isRank1
              ? "text-amber-400/40 drop-shadow-[0_2px_12px_rgba(251,191,36,0.3)]"
              : isRank2
              ? "text-slate-300/30"
              : "text-amber-600/30"
          }`}
        >
          {rank}
        </span>
      </Motion.div>
    </div>
  );
}

function AnimatedNumber({ value, duration = 0.8 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = parseInt(value, 10) || 0;
    if (target <= 0) {
      setDisplay(0);
      return;
    }
    const steps = Math.min(target, 30);
    const stepDuration = (duration * 1000) / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += Math.ceil(target / steps);
      if (current >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(current);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{display}</span>;
}

function getNumericMetric(user, metricType) {
  if (!user) return 0;
  if (metricType === "streak") {
    return user.streak?.current ?? 0;
  }
  if (metricType === "longest_streak") {
    return user.streak?.longest ?? 0;
  }
  if (metricType === "leetcode") {
    return user.leetcode?.totalSolved || user.leetcode?.today || 0;
  }
  if (metricType === "github") {
    return user.github?.totalContributions || user.github?.today || 0;
  }
  return user.overallScore ?? 0;
}
