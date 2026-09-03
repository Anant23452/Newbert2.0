import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hook/useAuth";
import { getLeaderboard } from "../Services/jobService";
import API from "../Services/api";
import LeaderboardPodium from "../components/Leaderboard/LeaderboardPodium";
import LeaderboardCard from "../components/Leaderboard/LeaderboardCard";

const TIME_RANGES = [
  ["today", "Today"],
  ["7d", "7 Days"],
  ["30d", "30 Days"],
  ["overall", "Overall"],
];

function rangePeriodLabel(range) {
  if (range === "today") return "today";
  if (range === "7d") return "past 7 days";
  if (range === "30d") return "past 30 days";
  return "overall";
}

export default function LeaderboardMetrics() {
  const { profile, isAuthenticated, refreshProfile } = useAuth();
  const [scope, setScope] = useState("global");
  const [search, setSearch] = useState("");
  const [githubRange, setGithubRange] = useState("7d");
  const [leetcodeRange, setLeetcodeRange] = useState("7d");

  const [data, setData] = useState({
    streak: { users: [], top: [], rows: [], currentUser: null },
    github: { users: [], top: [], rows: [], currentUser: null },
    leetcode: { users: [], top: [], rows: [], currentUser: null },
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const loadedRef = useRef(false);

  const hasCollege = Boolean(profile?.collegeId || data.resolvedCollege?.id);

  // Fetch leaderboard data whenever scope, search, or time ranges change
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
        githubRange,
        leetcodeRange,
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
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isAuthenticated, scope, search, githubRange, leetcodeRange, refreshKey]);

  // Refresh stats handler
  const refreshStats = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError("");
    setRefreshSuccess(false);
    try {
      await API.post("/profiles/sync", {});
      await refreshProfile();
      setRefreshKey((k) => k + 1);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2500);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to refresh your stats.");
    } finally {
      setRefreshing(false);
    }
  };

  // Section 1: Streak data
  const streakTopThree = useMemo(() => {
    return (data.streak?.users || []).slice(0, 3);
  }, [data.streak]);

  const streakRanksFourToTen = useMemo(() => {
    return (data.streak?.users || []).slice(3, 10);
  }, [data.streak]);

  const streakCurrentUser = data.streak?.currentUser;
  const isStreakUserOutsideTopTen = streakCurrentUser &&
    !(data.streak?.users || []).slice(0, 10).some((u) => u.userId === streakCurrentUser.userId);

  // Section 2: GitHub data
  const githubUsers = useMemo(() => {
    return (data.github?.users || []).slice(0, 10);
  }, [data.github]);

  const githubCurrentUser = data.github?.currentUser;
  const isGithubConnected = Boolean(profile?.githubUsername || profile?.githubStats?.username);
  const githubUserCommits = githubCurrentUser?.github?.commits?.[githubRange] ?? githubCurrentUser?.github?.[githubRange] ?? 0;

  // Section 3: LeetCode data
  const leetcodeUsers = useMemo(() => {
    return (data.leetcode?.users || []).slice(0, 10);
  }, [data.leetcode]);

  const leetcodeCurrentUser = data.leetcode?.currentUser;
  const isLeetcodeConnected = Boolean(profile?.leetcodeUsername || profile?.leetcodeStats?.username);
  const leetcodeUserSolved = leetcodeRange === "overall"
    ? (leetcodeCurrentUser?.leetcode?.totalSolved ?? 0)
    : (leetcodeCurrentUser?.leetcode?.solved?.[leetcodeRange] ?? leetcodeCurrentUser?.leetcode?.[leetcodeRange] ?? 0);
  const leetcodeUserSubmissions = leetcodeCurrentUser?.leetcode?.submissions?.[leetcodeRange] ?? 0;

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
    <main className="min-h-screen bg-[#0b1220] px-4 py-10 text-white sm:px-6 md:py-14">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* ─────────────────────────────────────────────────────────────
            1. HERO / LEADERBOARD HEADER
        ─────────────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-white/10 pb-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
              Rankings & Consistency
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl text-white">
              Real activity. Transparent rankings.
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              Ranked from verified coding activity — not arbitrary points.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Page-level My College | Global Scope */}
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
                  Refreshing activity...
                </>
              ) : refreshSuccess ? (
                <span className="text-emerald-400">✓ Activity updated</span>
              ) : (
                <>🔄 Refresh stats</>
              )}
            </button>
          </div>
        </header>

        {scope === "college" && data.college?.name && (
          <div className="flex items-center gap-2 text-xs font-extrabold text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3.5 py-2">
            <span>🏛️ Showing rankings for:</span>
            <strong className="text-white">{data.college.name}</strong>
          </div>
        )}

        {/* Global Search within active scope */}
        <div className="flex justify-end">
          <div className="w-full sm:w-72">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name..."
              className="w-full rounded-xl border border-white/15 bg-[#141d2e] px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-400 transition"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-xs font-bold text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-8">
            <div className="h-72 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-56 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-56 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : (
          <div className="space-y-16">
            {/* ─────────────────────────────────────────────────────────────
                SECTION 1 — CURRENT STREAK LEADERBOARD
                (No time filters. Strictly Current Streak.)
            ─────────────────────────────────────────────────────────────── */}
            <section className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                  🔥 Consistency
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  Top Streak Maintainers
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Students maintaining the strongest current coding consistency.
                </p>
              </div>

              {/* 1. Animated 2-1-3 Podium for Top 3 */}
              {streakTopThree.length > 0 ? (
                <LeaderboardPodium
                  users={streakTopThree}
                  mineId={profile?.userId}
                  scope={scope}
                  metricType="streak"
                />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#111927] p-8 text-center text-slate-400">
                  <p className="text-sm font-bold">No verified streak activity yet.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sync your GitHub or LeetCode account to record continuous daily activity.
                  </p>
                </div>
              )}

              {/* Top 10 List (Ranks 4–10) */}
              {streakRanksFourToTen.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Top 10 Streak Maintainers · Ranks #4 – #10
                  </h3>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {streakRanksFourToTen.map((entry) => (
                      <LeaderboardCard
                        key={entry.userId}
                        entry={entry}
                        mineId={profile?.userId}
                        scope={scope}
                        value={(u) => `🔥 ${u.streak?.current || 0} days`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Sticky / Dedicated rank card if current user is outside top 10 */}
              {isStreakUserOutsideTopTen && (
                <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-orange-300">
                      Your Streak Rank
                    </p>
                    <p className="text-lg font-black text-white">
                      #{streakCurrentUser.rank} · {streakCurrentUser.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-orange-500/20 px-3 py-1 text-xs font-black text-orange-300">
                      🔥 {streakCurrentUser.streak?.current || 0} day streak
                    </span>
                  </div>
                </div>
              )}
            </section>

            {/* ─────────────────────────────────────────────────────────────
                SECTION 2 — GITHUB CONTRIBUTORS LEADERBOARD
                (Filters: Today | 7 Days | 30 Days | Overall)
            ─────────────────────────────────────────────────────────────── */}
            <section className="space-y-6 pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                    💻 GitHub
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Top Git Contributors
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Ranked by verified GitHub commit activity.
                  </p>
                </div>

                {/* Independent Time Filters for GitHub */}
                <div className="flex rounded-xl border border-white/15 bg-[#141d2e] p-1 self-start sm:self-auto">
                  {TIME_RANGES.map(([rangeKey, label]) => (
                    <button
                      key={rangeKey}
                      onClick={() => setGithubRange(rangeKey)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                        githubRange === rangeKey
                          ? "bg-orange-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* GitHub Your Rank Card */}
              <div className="rounded-xl border border-white/10 bg-[#111927] p-4">
                {isGithubConnected ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-orange-400">
                        Your Rank
                      </p>
                      <p className="text-2xl font-black text-white">
                        {githubCurrentUser?.rank ? `#${githubCurrentUser.rank}` : "Unranked"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-orange-300">
                        💻 {githubUserCommits} commits {rangePeriodLabel(githubRange)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-white">
                        Connect GitHub to get your rank.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Sync your GitHub account to showcase verified commits on the leaderboard.
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      className="inline-flex items-center justify-center rounded-lg bg-orange-500/20 border border-orange-500/40 px-3.5 py-1.5 text-xs font-black text-orange-300 hover:bg-orange-500/30 transition"
                    >
                      Connect GitHub →
                    </Link>
                  </div>
                )}
              </div>

              {/* GitHub Top 10 List */}
              {githubUsers.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Top Contributors · Ranks #1 – #10
                  </h3>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {githubUsers.map((entry) => {
                      const commits = entry.github?.commits?.[githubRange] ?? entry.github?.[githubRange] ?? 0;
                      return (
                        <LeaderboardCard
                          key={entry.userId}
                          entry={entry}
                          mineId={profile?.userId}
                          scope={scope}
                          value={() => `💻 ${commits} commits`}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#111927] p-8 text-center text-slate-400">
                  <p className="text-sm font-bold">No verified GitHub activity for this period.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Push commits to your public repositories and click Refresh stats.
                  </p>
                </div>
              )}
            </section>

            {/* ─────────────────────────────────────────────────────────────
                SECTION 3 — LEETCODE SOLVERS LEADERBOARD
                (Filters: Today | 7 Days | 30 Days | Overall)
            ─────────────────────────────────────────────────────────────── */}
            <section className="space-y-6 pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                    ⚡ LeetCode
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Top LeetCode Solvers
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Ranked by verified LeetCode problem-solving activity.
                  </p>
                </div>

                {/* Independent Time Filters for LeetCode */}
                <div className="flex rounded-xl border border-white/15 bg-[#141d2e] p-1 self-start sm:self-auto">
                  {TIME_RANGES.map(([rangeKey, label]) => (
                    <button
                      key={rangeKey}
                      onClick={() => setLeetcodeRange(rangeKey)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                        leetcodeRange === rangeKey
                          ? "bg-orange-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* LeetCode Your Rank Card */}
              <div className="rounded-xl border border-white/10 bg-[#111927] p-4">
                {isLeetcodeConnected ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-orange-400">
                        Your Rank
                      </p>
                      <p className="text-2xl font-black text-white">
                        {leetcodeCurrentUser?.rank ? `#${leetcodeCurrentUser.rank}` : "Unranked"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-orange-300">
                        ⚡{" "}
                        {leetcodeRange === "overall" ? (
                          `${leetcodeUserSolved} problems solved`
                        ) : (
                          <>
                            <span>{leetcodeUserSolved} solved</span>
                            {leetcodeUserSubmissions > 0 && (
                              <span className="opacity-75 font-normal">
                                · {leetcodeUserSubmissions} submissions
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-white">
                        Connect LeetCode to get your rank.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Sync your LeetCode profile to rank among top DSA solvers.
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      className="inline-flex items-center justify-center rounded-lg bg-orange-500/20 border border-orange-500/40 px-3.5 py-1.5 text-xs font-black text-orange-300 hover:bg-orange-500/30 transition"
                    >
                      Connect LeetCode →
                    </Link>
                  </div>
                )}
              </div>

              {/* LeetCode Top 10 List */}
              {leetcodeUsers.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Top Solvers · Ranks #1 – #10
                  </h3>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {leetcodeUsers.map((entry) => {
                      const solved = leetcodeRange === "overall"
                        ? (entry.leetcode?.totalSolved ?? 0)
                        : (entry.leetcode?.solved?.[leetcodeRange] ?? entry.leetcode?.[leetcodeRange] ?? 0);
                      const submissions = entry.leetcode?.submissions?.[leetcodeRange] ?? 0;

                      return (
                        <LeaderboardCard
                          key={entry.userId}
                          entry={entry}
                          mineId={profile?.userId}
                          scope={scope}
                          value={() => (
                            <span className="inline-flex items-center gap-1">
                              <span>⚡ {solved} solved</span>
                              {leetcodeRange !== "overall" && submissions > 0 && (
                                <span className="opacity-60 text-[10px]">
                                  ({submissions} subs)
                                </span>
                              )}
                            </span>
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#111927] p-8 text-center text-slate-400">
                  <p className="text-sm font-bold">No verified LeetCode activity for this period.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Solve problems on LeetCode and click Refresh stats.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
