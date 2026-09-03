import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEVELS = ["bg-white/5", "bg-emerald-950", "bg-emerald-800", "bg-emerald-600", "bg-emerald-400"];

function buildYear(year, activityCalendar) {
  const activity = new Map((activityCalendar || []).map((day) => [day.date, day]));
  const days = [];
  const now = new Date();
  const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  for (const date = new Date(year, 0, 1); date.getFullYear() === year; date.setDate(date.getDate() + 1)) {
    const dateString = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const item = activity.get(dateString);
    const githubCommits = Number(item?.githubCommits ?? item?.github?.commits ?? item?.commits ?? item?.github ?? 0);
    const github = Number(item?.github?.total ?? item?.github ?? githubCommits);
    const leetcodeAccepted = Number(item?.leetcodeAccepted ?? item?.leetcode?.solved ?? (item?.leetcodeAcceptedProblems?.length || 0) ?? item?.leetcode ?? 0);
    const leetcode = Number(item?.leetcode?.submissions ?? item?.leetcode ?? leetcodeAccepted);
    const projectSource = item?.projectActivity ?? item?.project ?? item?.projects;
    const projectActivity = projectSource == null ? null : Number(projectSource) || 0;
    const total = Number(item?.totalVerifiedActivity ?? item?.total ?? (githubCommits + leetcodeAccepted + (projectActivity || 0)));

    days.push({
      date: new Date(date),
      dateString,
      month: date.getMonth(),
      weekday: date.getDay(),
      github,
      githubCommits,
      githubPullRequests: Number(item?.githubPullRequests ?? item?.github?.pullRequests ?? 0),
      githubIssues: Number(item?.githubIssues ?? item?.github?.issues ?? 0),
      leetcode,
      leetcodeAccepted,
      leetcodeAcceptedProblems: Array.isArray(item?.leetcodeAcceptedProblems) ? item.leetcodeAcceptedProblems : (item?.leetcode?.acceptedProblems || []),
      projectActivity,
      total,
      future: dateString > todayDateString,
    });
  }
  return days;
}

function buildWeeks(days) {
  const cells = [...Array(days[0]?.weekday || 0).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}

function calculateYearMetrics(days) {
  let totalActivities = 0;
  let activeDays = 0;
  let longestStreak = 0;
  let running = 0;
  for (const day of days) {
    totalActivities += day.total;
    if (day.total > 0) {
      activeDays += 1;
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    } else running = 0;
  }
  let yearEndStreak = 0;
  for (let index = days.length - 1; index >= 0 && days[index].total > 0; index -= 1) yearEndStreak += 1;
  return { totalActivities, activeDays, longestStreak, yearEndStreak };
}

function intensity(total) {
  if (total >= 7) return 4;
  if (total >= 4) return 3;
  if (total >= 2) return 2;
  if (total >= 1) return 1;
  return 0;
}

function streakStatus(days) {
  if (days === 0) return "Start your streak today";
  if (days < 7) return "Momentum building";
  if (days < 30) return "Strong consistency";
  if (days < 100) return "Exceptional consistency";
  return "Elite consistency";
}

export default function MomentumSection({
  activityCalendar = [],
  lastSyncedAt,
  currentStreak = 0,
  longestStreak = 0,
  ownerName = "You",
  isOwn = false,
  heatmapVisible = true,
  streakStatsVisible = true,
  compact = false,
  collegeRank = null,
  loadingRank = false,
  onRefreshStats,
  refreshing = false,
}) {
  const currentYear = new Date().getFullYear();
  const activityYears = activityCalendar.map((day) => Number(String(day.date || "").slice(0, 4))).filter(Number.isFinite);
  const yearOptions = [...new Set([currentYear, currentYear - 1, currentYear - 2, ...activityYears])].sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const days = useMemo(() => buildYear(selectedYear, activityCalendar), [selectedYear, activityCalendar]);
  const weeks = useMemo(() => buildWeeks(days), [days]);
  const metrics = useMemo(() => calculateYearMetrics(days), [days]);
  const monthLabels = useMemo(() => {
    const labels = [];
    let previous = -1;
    weeks.forEach((week, weekIndex) => {
      const day = week.find(Boolean);
      if (day && day.month !== previous) { labels.push({ name: MONTHS[day.month], weekIndex }); previous = day.month; }
    });
    return labels;
  }, [weeks]);
  const shownCurrent = selectedYear === currentYear ? Number(currentStreak) || 0 : metrics.yearEndStreak;
  const shownLongest = selectedYear === currentYear ? Number(longestStreak) || 0 : metrics.longestStreak;
  const gap = Math.max(0, shownLongest - shownCurrent);
  const monthDelta = useMemo(() => {
    const now = new Date();
    const currentMonth = days.filter((day) => day.month === now.getMonth() && !day.future).reduce((sum, day) => sum + day.total, 0);
    const previousMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const previousTotal = days.filter((day) => day.month === previousMonth).reduce((sum, day) => sum + day.total, 0);
    return currentMonth - previousTotal;
  }, [days]);

  if (compact) return <section className="overflow-hidden rounded-lg bg-[#111c2e] text-white shadow-[0_18px_50px_rgba(0,0,0,.18)]">
    <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 md:px-6 md:pt-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-orange-400">Activity</p>
        <h2 className="mt-1 text-xl font-black">Verified work, day by day</h2>
      </div>
      <div className="flex items-center gap-2">
        {onRefreshStats && (
          <button
            type="button"
            onClick={onRefreshStats}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#0b1220] px-2.5 py-1.5 text-xs font-extrabold text-slate-300 hover:border-orange-400 hover:text-white transition disabled:cursor-wait disabled:opacity-60"
            title="Refresh Stats"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin text-orange-400" : "text-slate-400"} />
            <span>{refreshing ? "Refreshing activity..." : "Refresh Stats"}</span>
          </button>
        )}
        <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} aria-label="Activity year" className="rounded-md border border-white/15 bg-[#0b1220] px-3 py-2 text-xs font-extrabold text-white outline-none focus:border-orange-400">{yearOptions.map((year) => <option key={year}>{year}</option>)}</select>
      </div>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4">
      <CompactMetric label="Verified activities" value={metrics.totalActivities.toLocaleString()} />
      <CompactMetric label="Current streak" value={streakStatsVisible ? `${shownCurrent} days` : "Private"} />
      <CompactMetric label="Growth this month" value={`${monthDelta >= 0 ? "+" : ""}${monthDelta}`} />
      <CompactMetric label="College rank" value={!streakStatsVisible ? "Private" : loadingRank ? "Loading" : collegeRank ? `#${collegeRank}` : "Build activity"} />
    </div>
    <div className="px-5 pb-5 md:px-6 md:pb-6">
      {!heatmapVisible ? <PrivateNotice text="Activity history is private."/> : activityCalendar.length === 0 ? <div className="mt-5 rounded-lg bg-white/[.04] p-5"><p className="font-extrabold text-white">Your activity graph is ready for its first signal.</p><p className="mt-1 text-sm text-slate-400">Connect GitHub or LeetCode to verify coding work and build your streak.</p></div> : <Heatmap weeks={weeks} monthLabels={monthLabels}/>} 
      {lastSyncedAt && heatmapVisible && <p className="mt-3 text-right text-[11px] text-slate-500">Updated {new Date(lastSyncedAt).toLocaleString()}</p>}
    </div>
  </section>;

  return <section className="overflow-hidden rounded-2xl border border-orange-400/20 bg-[#101827] text-white shadow-[0_18px_50px_rgba(2,6,23,.22)]">
    <div className="border-b border-white/10 p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-orange-400">Consistency & Streak</p>
          <h2 className="mt-2 text-2xl font-black">Momentum built from verified work</h2>
        </div>
        <div className="flex items-center gap-2">
          {onRefreshStats && (
            <button
              type="button"
              onClick={onRefreshStats}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#172033] px-3 py-2 text-xs font-extrabold text-slate-300 hover:border-orange-400 hover:text-white transition disabled:cursor-wait disabled:opacity-60"
              title="Refresh Stats"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-orange-400" : "text-slate-400"} />
              <span>{refreshing ? "Refreshing activity..." : "Refresh Stats"}</span>
            </button>
          )}
          <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} aria-label="Activity year" className="rounded-lg border border-white/15 bg-[#172033] px-3 py-2 text-sm font-extrabold text-white outline-none focus:border-orange-400">{yearOptions.map((year) => <option key={year}>{year}</option>)}</select>
        </div>
      </div>
      {streakStatsVisible ? <div className="mt-6 grid gap-3 md:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <div className="rounded-xl border border-orange-400/35 bg-orange-400/10 p-5"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-300">Current streak</p><div className="mt-2 flex items-end gap-2"><span className="text-4xl font-black text-white">{shownCurrent}</span><span className="pb-1 font-bold text-orange-200">days</span></div><p className="mt-2 text-sm font-semibold text-slate-300">{streakStatus(shownCurrent)}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-orange-400" style={{ width: `${shownLongest ? Math.min(100, (shownCurrent / shownLongest) * 100) : 0}%` }}/></div><p className="mt-2 text-xs text-slate-400">{gap ? `${gap} days from the personal best` : shownCurrent ? "Personal best matched" : "Personal best starts with one active day"}</p></div>
        <Metric label="Longest streak" value={`${shownLongest} days`} detail="Personal best"/>
        <Metric label="Active days" value={`${metrics.activeDays} days`} detail={`${Math.round((metrics.activeDays / days.length) * 100)}% of ${selectedYear}`}/>
        <Metric label="Verified activity" value={metrics.totalActivities.toLocaleString()} detail={`GitHub + LeetCode in ${selectedYear}`}/>
      </div> : <PrivateNotice text="Streak statistics are private."/>}
    </div>
    <div className="p-5 md:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Momentum</p><p className="mt-1 text-lg font-black">{heatmapVisible ? `${metrics.totalActivities.toLocaleString()} verified activities in ${selectedYear}` : `Activity history for ${selectedYear}`}</p></div>{lastSyncedAt && heatmapVisible && <p className="text-xs text-slate-400">Updated {new Date(lastSyncedAt).toLocaleString()}</p>}</div>
      {!heatmapVisible ? <PrivateNotice text="Activity history is private."/> : activityCalendar.length === 0 ? <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">{isOwn ? "Verified activity will appear here once GitHub or LeetCode is connected." : `${ownerName.split(" ")[0] || "This student"} hasn't connected public activity sources yet.`}</p> : <Heatmap weeks={weeks} monthLabels={monthLabels}/>} 
      {heatmapVisible && activityCalendar.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-400"><span>Verified from synced GitHub and LeetCode activity</span><div className="flex items-center gap-1.5"><span>Less</span>{LEVELS.map((color, index) => <span key={index} className={`h-3 w-3 rounded-[3px] ${color}`}/>)}<span>More</span></div></div>}
    </div>
  </section>;
}

function Heatmap({ weeks, monthLabels }) {
  const [tooltip, setTooltip] = useState(null);
  return <div className="relative mt-6 overflow-x-auto pb-2"><div className="min-w-[830px]"><div className="relative ml-9 h-5 text-[11px] font-bold text-slate-400">{monthLabels.map((month) => <span key={`${month.name}-${month.weekIndex}`} className="absolute" style={{ left: `${month.weekIndex * 15}px` }}>{month.name}</span>)}</div><div className="flex gap-2"><div className="grid w-7 shrink-0 grid-rows-7 gap-[3px] text-[9px] font-bold leading-3 text-slate-500">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="flex gap-[3px]">{weeks.map((week, weekIndex) => <div key={weekIndex} className="flex flex-col gap-[3px]">{week.map((day, dayIndex) => day ? <button key={day.dateString} type="button" aria-label={`${day.dateString}: ${day.total} verified activities`} onMouseEnter={(event) => setTooltip({ day, x: event.clientX, y: event.clientY })} onMouseMove={(event) => setTooltip({ day, x: event.clientX, y: event.clientY })} onMouseLeave={() => setTooltip(null)} className={`h-3 w-3 rounded-[3px] ${day.future ? "cursor-default bg-white/[.03]" : `${LEVELS[intensity(day.total)]} hover:ring-2 hover:ring-emerald-300/50`}`}/> : <span key={`${weekIndex}-${dayIndex}`} className="h-3 w-3"/>)}</div>)}</div></div></div>{tooltip && <Tooltip {...tooltip}/>}</div>;
}

function Tooltip({ day, x, y }) {
  const [year, month, d] = (day.dateString || "").split("-");
  const monthName = MONTHS[Number(month) - 1] || "Sep";
  const dateFormatted = `${monthName.toUpperCase()} ${Number(d)}, ${year}`;

  const githubCommits = Number(day.githubCommits ?? day.github?.commits ?? day.github ?? 0);
  const leetcodeSolved = Number(day.leetcodeAccepted ?? day.leetcode?.solved ?? (day.leetcodeAcceptedProblems?.length || 0) ?? day.leetcode ?? 0);
  const totalVerified = Number(day.total ?? (githubCommits + leetcodeSolved));

  return (
    <div
      className="pointer-events-none fixed z-[100] w-64 rounded-xl border border-white/20 bg-[#0b1220]/95 p-3.5 backdrop-blur-md shadow-2xl"
      style={{
        left: Math.min(x + 14, window.innerWidth - 270),
        top: Math.max(12, y - 180),
      }}
    >
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">{dateFormatted}</p>
      <p className="mt-1.5 text-base font-black text-emerald-400">
        {totalVerified} verified {totalVerified === 1 ? "activity" : "activities"}
      </p>
      <div className="mt-2.5 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-2">
        {githubCommits > 0 ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GitHub</p>
            <p className="font-extrabold text-white">
              {githubCommits} {githubCommits === 1 ? "commit" : "commits"}
            </p>
          </div>
        ) : null}
        {day.githubPullRequests > 0 ? (
          <p className="flex justify-between"><span className="text-slate-400">Pull requests:</span><span className="font-bold text-white">{day.githubPullRequests}</span></p>
        ) : null}
        {day.githubIssues > 0 ? (
          <p className="flex justify-between"><span className="text-slate-400">Issues:</span><span className="font-bold text-white">{day.githubIssues}</span></p>
        ) : null}
        {leetcodeSolved > 0 ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">LeetCode</p>
            <p className="font-extrabold text-white">
              {leetcodeSolved} {leetcodeSolved === 1 ? "problem solved" : "problems solved"}
            </p>
          </div>
        ) : null}
        {day.projectActivity != null && day.projectActivity > 0 ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Projects</p>
            <p className="font-extrabold text-white">{day.projectActivity} verified</p>
          </div>
        ) : null}
        {totalVerified === 0 ? (
          <p className="text-slate-500 italic">0 verified activities</p>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value, detail }) { return <div className="rounded-xl border border-white/10 bg-white/[.04] p-4"><p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-3 text-xl font-black text-white">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>; }
function CompactMetric({ label, value }) { return <div className="bg-[#0e1828] px-4 py-3"><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-white">{value}</p></div>; }
function PrivateNotice({ text }) { return <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5 text-sm font-bold text-slate-300">{text}</p>; }
