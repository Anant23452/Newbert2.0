import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hook/useAuth";
import { getLeaderboard } from "../Services/jobService";
import API from "../Services/api";
import PodiumTopThree from "../components/LeaderBoard/PodiumTopThree";
import LeaderBoardCard from "../components/LeaderBoard/LeaderBoardCard";

const BOARDS = [
  { id: "streak", label: "Streak", icon: "🔥" },
  { id: "github", label: "GitHub", icon: "💻" },
  { id: "dsa", label: "DSA (LeetCode)", icon: "⚡" },
  { id: "overall", label: "Overall", icon: "⭐" },
];

const TIME_RANGES = [
  ["today", "Today"],
  ["7d", "7 Days"],
  ["30d", "30 Days"],
  ["overall", "All Time"],
];

const STREAK_RANGES = [
  ["current", "Current Streak"],
  ["longest", "Longest Streak"],
];

export default function LeaderboardMetrics() {
  const { profile, isAuthenticated, refreshProfile } = useAuth();
  const [activeBoard, setActiveBoard] = useState("streak");
  const [scope, setScope] = useState("college");
  const [search, setSearch] = useState("");
  const [leetcodeRange, setLeetcodeRange] = useState("7d");
  const [githubRange, setGithubRange] = useState("7d");
  const [streakRange, setStreakRange] = useState("current");
  const [data, setData] = useState({
    overall: { users: [], top: [] },
    streak: { users: [], top: [] },
    leetcode: { users: [], top: [] },
    github: { users: [], top: [] },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const loadedRef = useRef(false);

  const hasCollege = Boolean(profile?.collegeId || data.resolvedCollege?.id);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setLoading(false);
      return undefined;
    }
    if (!loadedRef.current) setLoading(true);

    const timer = setTimeout(() => {
      getLeaderboard({
        scope,
        search: search || undefined,
        leetcodeRange,
        githubRange,
        streakRange,
      })
        .then((result) => {
          if (!active) return;
          if (result.needsCollege && scope === "college") {
            setScope("global");
            return;
          }
          setData(result);
          loadedRef.current = true;
          setError("");
        })
        .catch((requestError) => {
          if (active) {
            setError(requestError.response?.data?.message || "Leaderboard API is temporarily unavailable.");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isAuthenticated, scope, search, leetcodeRange, githubRange, streakRange, refreshKey]);

  const refreshStats = async () => {
    setRefreshing(true);
    setError("");
    try {
      await API.post("/profiles/sync", {});
      await refreshProfile();
      setRefreshKey((k) => k + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to refresh your stats.");
    } finally {
      setRefreshing(false);
    }
  };

  // Derive board data based on active tab
  const currentBoardData = useMemo(() => {
    if (activeBoard === "streak") return data.streak || { users: [], top: [] };
    if (activeBoard === "github") return data.github || { users: [], top: [] };
    if (activeBoard === "dsa") return data.leetcode || { users: [], top: [] };
    return data.overall || { users: [], top: [] };
  }, [activeBoard, data]);

  const activeTopThree = useMemo(() => {
    return (currentBoardData.users || []).slice(0, 3);
  }, [currentBoardData]);

  const activeRanksFourToTen = useMemo(() => {
    return (currentBoardData.users || []).slice(3, 10);
  }, [currentBoardData]);

  const topStreakMaintainers = useMemo(() => {
    return (data.streak?.users || []).slice(0, 10);
  }, [data.streak]);

  const currentUserInActiveBoard = currentBoardData.currentUser;
  const isCurrentUserOutsideTopTen = currentUserInActiveBoard &&
    !(currentBoardData.users || []).slice(0, 10).some((u) => u.userId === currentUserInActiveBoard.userId);

  const getMetricLabel = (entry) => {
    if (activeBoard === "streak") {
      const days = streakRange === "longest" ? entry.streak?.longest : entry.streak?.current;
      return `🔥 ${days || 0} days`;
    }
    if (activeBoard === "github") {
      const count = githubRange === "overall" ? entry.github?.totalContributions : entry.github?.[githubRange];
      return `💻 ${count || 0} ${githubRange === "overall" ? "contributions" : "commits"}`;
    }
    if (activeBoard === "dsa") {
      const count = leetcodeRange === "overall" ? entry.leetcode?.totalSolved : entry.leetcode?.[leetcodeRange];
      return `⚡ ${count || 0} solved`;
    }
    return `⭐ ${entry.overallScore || 0} pts`;
  };

  if (!isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b1220] px-5 text-center text-white">
        <div className="max-w-md rounded-2xl border border-white/10 bg-[#111927] p-8 shadow-2xl">
          <h1 className="text-3xl font-black">Leaderboard</h1>
          <p className="mt-3 text-sm text-slate-300">
            Sign in to view real, verified Newbert activity rankings across colleges.
          </p>
          <Link
            to="/signin"
            className="mt-6 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-extrabold text-slate-950 hover:bg-orange-400 transition"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1220] px-4 py-10 text-white sm:px-6 md:py-16">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header Section */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-white/10 pb-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
              Rankings & Consistency
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl md:text-5xl text-white">
              Real activity. Transparent rankings.
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Ranked from verified GitHub commits, LeetCode solutions, and consecutive coding streaks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Switcher */}
            <div className="flex rounded-xl border border-white/15 bg-[#141d2e] p-1">
              <button
                disabled={!hasCollege && !loading}
                onClick={() => setScope("college")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-black transition disabled:opacity-40 ${
                  scope === "college" ? "bg-orange-500 text-slate-950 shadow" : "text-slate-300 hover:text-white"
                }`}
              >
                My College
              </button>
              <button
                onClick={() => setScope("global")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-black transition ${
                  scope === "global" ? "bg-orange-500 text-slate-950 shadow" : "text-slate-300 hover:text-white"
                }`}
              >
                Global
              </button>
            </div>

            {/* Refresh Stats Button */}
            <button
              onClick={refreshStats}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#141d2e] px-4 py-2 text-xs font-black text-slate-200 hover:border-orange-400 hover:text-white transition disabled:opacity-50"
            >
              {refreshing ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                  Refreshing...
                </>
              ) : (
                <>🔄 Refresh stats</>
              )}
            </button>
          </div>
        </header>

        {scope === "college" && data.college?.name && (
          <div className="flex items-center gap-2 text-xs font-extrabold text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
            <span>🏛️ Showing rankings for:</span>
            <strong className="text-white">{data.college.name}</strong>
          </div>
        )}

        {/* Board Selection & Time Filter Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Main Board Tabs */}
          <div className="flex flex-wrap gap-2">
            {BOARDS.map((board) => (
              <button
                key={board.id}
                onClick={() => setActiveBoard(board.id)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                  activeBoard === board.id
                    ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20"
                    : "border border-white/15 bg-[#141d2e] text-slate-300 hover:border-white/30 hover:text-white"
                }`}
              >
                <span>{board.icon}</span>
                <span>{board.label}</span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-64">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name..."
              className="w-full rounded-xl border border-white/15 bg-[#141d2e] px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-400 transition"
            />
          </div>
        </div>

        {/* Sub-Filters / Time Range Selector */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <span className="text-xs font-bold text-slate-400 mr-1">Time Range:</span>
          {activeBoard === "streak" ? (
            STREAK_RANGES.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStreakRange(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  streakRange === value
                    ? "bg-white/15 text-orange-400 border border-orange-400/40"
                    : "border border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))
          ) : activeBoard === "github" ? (
            TIME_RANGES.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setGithubRange(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  githubRange === value
                    ? "bg-white/15 text-orange-400 border border-orange-400/40"
                    : "border border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))
          ) : activeBoard === "dsa" ? (
            TIME_RANGES.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setLeetcodeRange(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  leetcodeRange === value
                    ? "bg-white/15 text-orange-400 border border-orange-400/40"
                    : "border border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))
          ) : (
            <span className="text-xs font-bold text-slate-300">All-time overall score</span>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-xs font-bold text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="h-80 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-44 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* 1. Animated 2-1-3 Podium Section */}
            {activeTopThree.length > 0 ? (
              <PodiumTopThree
                users={activeTopThree}
                mineId={profile?.userId}
                scope={scope}
                metricType={activeBoard}
                metricLabel={getMetricLabel}
              />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#111927] p-8 text-center text-slate-400">
                <p className="text-sm font-bold">No activity recorded for this period yet.</p>
                <p className="mt-1 text-xs">Sync your GitHub or LeetCode profile to claim a top rank.</p>
              </div>
            )}

            {/* 2. Ranks 4-10 for Active Board */}
            {activeRanksFourToTen.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Leaderboard · Ranks #4 – #10
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    {currentBoardData.users?.length} ranked students
                  </span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {activeRanksFourToTen.map((entry) => (
                    <LeaderBoardCard
                      key={entry.userId}
                      entry={entry}
                      mineId={profile?.userId}
                      scope={scope}
                      value={getMetricLabel}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 3. Top Streak Maintainers Section (Ranks 1–10) */}
            {activeBoard !== "streak" && topStreakMaintainers.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-[#0e1626] p-5 sm:p-7 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-orange-400">
                      🔥 TOP STREAK MAINTAINERS
                    </p>
                    <h2 className="mt-1 text-lg font-black text-white">
                      Consistency Champions (Ranks 1–10)
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveBoard("streak")}
                    className="text-xs font-extrabold text-orange-400 hover:text-orange-300 transition"
                  >
                    View full streak board →
                  </button>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {topStreakMaintainers.map((entry) => (
                    <LeaderBoardCard
                      key={`streak-${entry.userId}`}
                      entry={entry}
                      mineId={profile?.userId}
                      scope={scope}
                      value={(u) => `🔥 ${u.streak?.current || 0} days`}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 4. Current User Sticky Position (when outside top 10) */}
            {isCurrentUserOutsideTopTen && (
              <div className="sticky bottom-4 z-30 rounded-2xl border-2 border-orange-400 bg-[#162136]/95 backdrop-blur-md p-4 shadow-2xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 font-black text-slate-950">
                      #{currentUserInActiveBoard.rank}
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-orange-300">
                        Your Current Rank
                      </p>
                      <p className="text-sm font-extrabold text-white">
                        {currentUserInActiveBoard.name} · You
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-black text-orange-200">
                      {getMetricLabel(currentUserInActiveBoard)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
