import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../Services/api";
import useAuth from "../hook/useAuth";

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { profile: ownProfile } = useAuth();
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    if (ownProfile?.userId === userId) { navigate("/profile", { replace: true }); return undefined; }
    let active = true;
    API.get(`/profiles/${userId}/public`).then(({ data }) => { if (active) setState({ profile: data, loading: false }); }).catch((error) => { if (active) setState({ error: error.response?.data?.message || "Profile not found.", loading: false }); });
    return () => { active = false; };
  }, [userId, ownProfile?.userId, navigate]);
  if (state.loading) return <main className="min-h-screen bg-[#111827] p-10 text-white">Loading profile...</main>;
  if (state.error) return <main className="min-h-screen bg-[#111827] p-10 text-white"><Link to="/leaderboard" className="text-orange-300">Back to Leaderboard</Link><p className="mt-8">{state.error}</p></main>;
  const p = state.profile;
  return <main className="min-h-screen bg-[#111827] px-5 py-12 text-white"><div className="mx-auto max-w-4xl"><Link to="/leaderboard" className="text-sm font-bold text-orange-300">Back to Leaderboard</Link><header className="mt-6 overflow-hidden border border-white/10 bg-[#172033]"><div className="h-32 bg-[#2c1c18] bg-cover bg-center" style={p.cover ? { backgroundImage: `url(${p.cover})` } : undefined}/><div className="px-6 pb-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end"><div className="-mt-10 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-[#172033] bg-orange-500 text-2xl font-black text-slate-950">{p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover"/> : p.name?.slice(0, 1)}</div><div><h1 className="text-3xl font-black">{p.name}</h1><p className="mt-1 text-slate-300">{p.college.name || "College not listed"}{p.branch ? ` · ${p.branch}` : ""}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Stat label="Current streak" value={`${p.leaderboard.streakDays} days`}/><Stat label="Longest streak" value={`${p.leaderboard.longestStreak} days`}/></div></div></header>{p.private ? <section className="mt-6 border border-white/10 bg-[#172033] p-8 text-center"><h2 className="text-xl font-black">This profile is private.</h2><p className="mt-2 text-sm text-slate-400">Only basic identity and leaderboard streak are visible.</p></section> : <PublicSections profile={p}/>}</div></main>;
}

function PublicSections({ profile: p }) {
  const links = [["LinkedIn", p.linkedin?.url], ["GitHub", p.github?.url], ["LeetCode", p.leetcode?.url]].filter(([, url]) => url);
  return <div className="mt-6 grid gap-6">{links.length > 0 && <Section title="Profile Links"><div className="flex flex-wrap gap-3">{links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-orange-400/40 bg-orange-400/10 px-3 py-2 text-sm font-extrabold text-orange-200 hover:border-orange-300 hover:text-orange-100">{label}<span aria-hidden="true">↗</span></a>)}</div></Section>}{p.about && <Section title="About"><p className="text-sm leading-7 text-slate-300">{p.about.bio || "No bio added."}</p></Section>}{p.skills && <Section title="Skills"><div className="flex flex-wrap gap-2">{p.skills.length ? p.skills.map((skill) => <span key={skill} className="bg-orange-400/10 px-2.5 py-1.5 text-xs font-bold text-orange-100">{skill}</span>) : <p className="text-sm text-slate-400">No public skills listed.</p>}</div></Section>}<div className="grid gap-6 md:grid-cols-2">{p.github && <Section title="GitHub"><Integration connected={p.github.connected} lines={p.github.connected ? [`@${p.github.username}`, `${p.github.publicRepos} public repositories`, `${p.github.followers} followers`, p.github.metricAvailable ? `${p.github.commitsToday} commits today` : "Refresh required for commit activity"] : []}/></Section>}{p.leetcode && <Section title="LeetCode"><Integration connected={p.leetcode.connected} lines={p.leetcode.connected ? [`@${p.leetcode.username}`, `${p.leetcode.totalSolved} total solved`, p.leetcode.metricAvailable ? `${p.leetcode.acceptedToday} accepted problems today` : "Refresh required for accepted-problem activity"] : []}/></Section>}</div>{p.activityCalendar && <ContributionCalendar activity={p.activityCalendar} lastSyncedAt={p.leaderboard.lastSyncedAt}/>}<div className="grid gap-6 md:grid-cols-3">{p.projects && <Section title="Projects"><p className="text-2xl font-black text-orange-300">{p.projects.count ?? "Not listed"}</p><p className="mt-1 text-xs text-slate-400">Completed projects</p></Section>}{p.education && <Section title="Education"><p className="font-bold">{p.education.graduationYear ? `Class of ${p.education.graduationYear}` : "Graduation year not listed"}</p>{p.education.cgpa != null && <p className="mt-2 text-sm text-slate-400">CGPA {p.education.cgpa}</p>}</Section>}{p.careerGoal && <Section title="Career Goal"><p className="font-bold">{p.careerGoal.role || "Not listed"}</p></Section>}</div></div>;
}

function ContributionCalendar({ activity, lastSyncedAt }) {
  const year = new Date().getFullYear();
  const byDate = new Map(activity.map((day) => [day.date, day]));
  const first = new Date(year, 0, 1);
  const cells = Array(first.getDay()).fill(null);
  for (const date = new Date(first); date.getFullYear() === year; date.setDate(date.getDate() + 1)) {
    const key = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    cells.push({ key, ...(byDate.get(key) || { github: 0, leetcode: 0, total: 0 }) });
  }
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  const yearly = cells.filter(Boolean);
  const total = yearly.reduce((sum, day) => sum + day.total, 0);
  const level = (value) => value >= 10 ? "bg-orange-400" : value >= 6 ? "bg-orange-500" : value >= 3 ? "bg-orange-700" : value > 0 ? "bg-orange-950" : "bg-white/5";
  return <Section title="Contribution Calendar"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-extrabold">{total.toLocaleString()} verified activities in {year}</p>{lastSyncedAt && <p className="text-xs text-slate-400">Synced {new Date(lastSyncedAt).toLocaleDateString()}</p>}</div><div className="mt-5 overflow-x-auto pb-2"><div className="flex min-w-[780px] gap-[3px]">{weeks.map((week, weekIndex) => <div key={weekIndex} className="flex flex-col gap-[3px]">{week.map((day, dayIndex) => <span key={day?.key || `${weekIndex}-${dayIndex}`} title={day ? `${day.key}: ${day.total} activities (${day.github} GitHub, ${day.leetcode} LeetCode)` : undefined} className={`h-3 w-3 ${day ? level(day.total) : "bg-transparent"}`}/>)}</div>)}</div></div><div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] font-bold text-slate-400"><span>Less</span>{[0, 1, 3, 6, 10].map((value) => <span key={value} className={`h-3 w-3 ${level(value)}`}/>)}<span>More</span></div></Section>;
}
function Section({ title, children }) { return <section className="border border-white/10 bg-[#172033] p-6"><h2 className="text-xs font-extrabold uppercase tracking-widest text-orange-300">{title}</h2><div className="mt-4">{children}</div></section>; }
function Integration({ connected, lines }) { if (!connected) return <p className="text-sm text-slate-400">Not connected</p>; return <div className="space-y-1">{lines.map((line) => <p key={line} className="text-sm font-semibold text-slate-300">{line}</p>)}</div>; }
function Stat({ label, value }) { return <div className="border border-white/10 bg-black/10 p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 font-extrabold">{value}</p></div>; }
