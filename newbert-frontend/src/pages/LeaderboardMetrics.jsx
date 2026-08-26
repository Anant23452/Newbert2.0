import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hook/useAuth";
import { getLeaderboard } from "../Services/jobService";
import API from "../Services/api";

const RANGES = [["today", "Today"], ["7d", "7 Days"], ["30d", "30 Days"], ["overall", "Overall"]];

export default function LeaderboardMetrics() {
  const { profile, isAuthenticated, refreshProfile } = useAuth();
  const [scope, setScope] = useState("college");
  const [search, setSearch] = useState("");
  const [leetcodeRange, setLeetcodeRange] = useState("7d");
  const [githubRange, setGithubRange] = useState("7d");
  const [data, setData] = useState({ streak: { users: [], top: [] }, leetcode: { users: [] }, github: { users: [] } });
  const [loading, setLoading] = useState(true);
  const [rangeLoading, setRangeLoading] = useState({ leetcode: false, github: false });
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const loadedRef = useRef(false);
  const hasCollege = Boolean(profile?.collegeId || data.resolvedCollege?.id);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) { setLoading(false); return undefined; }
    if (!loadedRef.current) setLoading(true);
    const timer = setTimeout(() => getLeaderboard({ scope, search: search || undefined, leetcodeRange, githubRange }).then((result) => {
      if (!active) return;
      if (result.needsCollege && scope === "college") { setScope("global"); return; }
      setData(result);
      loadedRef.current = true;
      setError("");
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || "Leaderboard API is temporarily unavailable.");
    }).finally(() => { if (active) { setLoading(false); setRangeLoading({ leetcode: false, github: false }); } }), 200);
    return () => { active = false; clearTimeout(timer); };
  }, [isAuthenticated, scope, search, leetcodeRange, githubRange, refreshKey]);

  const refreshStats = async () => {
    setRefreshing(true);
    setError("");
    try {
      await API.post("/profiles/sync", {});
      await refreshProfile();
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to refresh your stats.");
    } finally { setRefreshing(false); }
  };

  const changeRange = (type, value) => {
    setRangeLoading((current) => ({ ...current, [type]: true }));
    if (type === "leetcode") setLeetcodeRange(value);
    else setGithubRange(value);
  };

  if (!isAuthenticated) return <main className="grid min-h-screen place-items-center bg-[#111827] px-5 text-center text-white"><div><h1 className="text-3xl font-black">Leaderboard</h1><p className="mt-3 text-slate-300">Sign in to compare your real Newbert activity.</p><Link to="/signin" className="mt-6 inline-flex rounded-lg bg-orange-500 px-4 py-3 font-extrabold text-slate-950">Sign in</Link></div></main>;

  return <main className="min-h-screen bg-[#111827] px-5 py-12 text-white md:py-16"><div className="mx-auto max-w-6xl">
    <header><p className="text-xs font-extrabold uppercase tracking-[.2em] text-orange-400">Leaderboard</p><h1 className="mt-3 text-3xl font-black md:text-5xl">Real activity. Clear rankings.</h1><div className="mt-7 flex flex-wrap gap-2">{[["college", "My College"], ["global", "Global"]].map(([value, label]) => <button key={value} disabled={value === "college" && !hasCollege && !loading} onClick={() => setScope(value)} className={`rounded-lg px-4 py-2.5 text-sm font-extrabold disabled:opacity-40 ${scope === value ? "bg-orange-500 text-slate-950" : "border border-white/15 text-slate-200"}`}>{label}</button>)}<button onClick={refreshStats} disabled={refreshing} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-extrabold text-slate-200 disabled:opacity-50">{refreshing ? "Refreshing..." : "Refresh my stats"}</button></div>{scope === "college" && data.college?.name && <p className="mt-4 font-bold text-slate-300">{data.college.name}</p>}{!hasCollege && !loading && <p className="mt-4 text-sm text-orange-200">Complete your college profile to unlock My College ranking.</p>}</header>
    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student" className="mt-7 w-full rounded-lg border border-white/10 bg-[#172033] px-4 py-3 text-sm outline-none focus:border-orange-400 sm:max-w-sm"/>
    {error && <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    {loading ? <Skeletons/> : <><Podium users={(data.streak?.users || []).slice(0, 3)} mineId={profile?.userId}/><StreakBoard data={data.streak} mineId={profile?.userId} scope={scope}/><div className="grid gap-6 lg:grid-cols-2"><MetricBoard type="leetcode" title="Top LeetCode Solvers" data={data.leetcode} range={leetcodeRange} onRangeChange={(value) => changeRange("leetcode", value)} loading={rangeLoading.leetcode} mineId={profile?.userId} scope={scope}/><MetricBoard type="github" title="Top GitHub Contributors" data={data.github} range={githubRange} onRangeChange={(value) => changeRange("github", value)} loading={rangeLoading.github} mineId={profile?.userId} scope={scope}/></div></>}
  </div></main>;
}

function Podium({ users, mineId }) {
  if (!users.length) return null;
  const ordered = users.length === 3 ? [users[1], users[0], users[2]] : users;
  return <section className="mt-9"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-400">Top Streak Maintainers</p><div className="mt-4 grid items-end gap-3 sm:grid-cols-3">{ordered.map((entry) => <Link key={entry.userId} to={entry.userId === mineId ? "/profile" : `/profile/${entry.userId}`} className={`border bg-[#172033] p-5 ${entry.rank === 1 ? "border-orange-400 sm:pb-9 sm:pt-8" : "border-white/10"}`}><p className="text-2xl font-black text-orange-300">#{entry.rank}</p><p className="mt-3 text-lg font-black">{entry.name}{entry.userId === mineId ? " · You" : ""}</p><p className="mt-1 text-sm text-slate-400">{entry.college.name || "College not listed"}</p><p className="mt-4 font-extrabold">{entry.streak.current} day streak</p></Link>)}</div></section>;
}

function StreakBoard({ data = {}, mineId, scope }) {
  const mine = data.currentUser;
  const topTen = (data.users || []).slice(0, 10);
  const outsideTopTen = mine && !topTen.some((entry) => entry.userId === mine.userId);
  return <BoardShell title="Streak Ranking · #4–#10" subtitle="Current streak descending. Ties use recent activity, then user ID."><Rows users={topTen.filter((entry) => entry.rank > 3)} mineId={mineId} scope={scope} value={(entry) => `${entry.streak.current} days`} emptyText={topTen.length <= 3 ? "Fewer than four real users are ranked in this scope." : undefined}/>{outsideTopTen && <OwnRank rank={mine.rank} value={`${mine.streak.current} days`}/>}</BoardShell>;
}

function MetricBoard({ type, title, data = {}, range, onRangeChange, loading, mineId, scope }) {
  const mine = data.currentUser;
  const topTen = (data.users || []).slice(0, 10);
  const outsideTopTen = mine && !topTen.some((entry) => entry.userId === mine.userId);
  const unavailable = data.status === "not_connected" ? `${type === "leetcode" ? "LeetCode" : "GitHub"} not connected` : data.status === "refresh_required" ? "Refresh your stats to join this time-range ranking." : data.status === "no_activity" ? (type === "leetcode" ? "No LeetCode questions solved in this range." : "No GitHub activity in this range.") : "";
  const count = (entry) => type === "leetcode" ? (range === "overall" ? entry.leetcode.totalSolved : entry.leetcode[range]) : (range === "overall" ? entry.github.totalContributions : entry.github[range]);
  const label = (entry) => metricLabel(type, range, count(entry));
  const emptyText = type === "leetcode" ? (range === "today" ? "No LeetCode questions solved today." : `No LeetCode activity for ${data.label || "this range"}.`) : (range === "today" ? "No GitHub commit activity today." : `No GitHub activity for ${data.label || "this range"}.`);
  return <BoardShell title={title} subtitle={type === "leetcode" ? "Ranked by unique accepted questions." : range === "overall" ? "Overall is labelled using verified contributions." : "Ranked by verified commits."}><RangeTabs value={range} onChange={onRangeChange}/>{loading && <p className="mt-3 text-xs font-bold text-orange-200">Updating this section...</p>}{!mine && unavailable && <p className="mt-4 text-sm font-bold text-orange-200">{unavailable}</p>}<div className={loading ? "opacity-60" : ""}><Rows users={topTen} mineId={mineId} scope={scope} value={label} emptyText={emptyText}/>{outsideTopTen && <OwnRank rank={mine.rank} value={label(mine)}/>}</div></BoardShell>;
}

function metricLabel(type, range, count) {
  if (type === "leetcode") return range === "today" ? `${count} questions today` : range === "7d" ? `${count} questions in last 7 days` : range === "30d" ? `${count} questions in last 30 days` : `${count} total solved`;
  return range === "today" ? `${count} commits today` : range === "7d" ? `${count} commits in last 7 days` : range === "30d" ? `${count} commits in last 30 days` : `${count} total contributions`;
}

function BoardShell({ title, subtitle, children }) { return <section className="mt-8 border border-white/10 bg-[#172033] p-5"><div className="border-b border-white/10 pb-4"><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-sm text-slate-400">{subtitle}</p></div>{children}</section>; }
function RangeTabs({ value, onChange }) { return <div className="mt-4 flex flex-wrap gap-2">{RANGES.map(([range, label]) => <button key={range} onClick={() => onChange(range)} className={`px-3 py-2 text-xs font-extrabold ${value === range ? "bg-orange-500 text-slate-950" : "border border-white/10 text-slate-300"}`}>{label}</button>)}</div>; }
function OwnRank({ rank, value }) { return <div className="mt-4 flex items-center justify-between border border-orange-400/40 bg-orange-400/5 px-4 py-3"><div><p className="text-xs font-bold uppercase text-orange-200">Your Rank</p><p className="mt-1 text-xl font-black">#{rank}</p></div><p className="text-sm font-extrabold text-orange-100">{value}</p></div>; }
function Rows({ users = [], mineId, scope, value, emptyText }) { return <div className="mt-3 space-y-1">{users.map((entry) => <Link key={entry.userId} to={entry.userId === mineId ? "/profile" : `/profile/${entry.userId}`} state={{ fromLeaderboard: scope }} className={`flex items-center gap-3 border px-3 py-3 ${entry.userId === mineId ? "border-orange-400 bg-orange-400/5" : "border-transparent hover:border-white/10"}`}><span className="w-7 font-black text-orange-300">#{entry.rank}</span><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-orange-500 font-black text-slate-950">{entry.avatar ? <img src={entry.avatar} alt="" className="h-full w-full object-cover"/> : entry.name.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="truncate font-extrabold">{entry.userId === mineId ? `${entry.name} · You` : entry.name}</p><p className="truncate text-xs text-slate-400">{entry.college.name}{entry.branch ? ` · ${entry.branch}` : ""}</p></div><p className="max-w-[42%] text-right text-xs font-bold text-slate-200">{value(entry)}</p></Link>)}{!users.length && <p className="py-6 text-center text-sm text-slate-400">{emptyText || "No eligible synced users in this scope yet."}</p>}</div>; }
function Skeletons() { return <div className="mt-8 space-y-6">{[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse bg-white/10"/>)}</div>; }
