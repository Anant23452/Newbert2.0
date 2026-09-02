import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExternalLink, Github, Globe, Lock } from "lucide-react";
import API from "../Services/api";
import useAuth from "../hook/useAuth";
import MomentumSection from "../profileComponents/MomentumSection";
import StreakLeaderboardPreview from "../profileComponents/StreakLeaderboardPreview";

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { profile: ownProfile } = useAuth();
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let active = true;
    API.get(`/profiles/${userId}/public`).then(({ data }) => { if (active) setState({ profile: data, loading: false }); }).catch((error) => { if (active) setState({ error: error.response?.data?.message || "Profile not found.", loading: false }); });
    return () => { active = false; };
  }, [userId]);
  if (state.loading) return <PublicProfileLoading/>;
  if (state.error) return <main className="min-h-screen bg-[#111827] p-10 text-white"><Link to="/leaderboard" className="text-orange-300">Back to Leaderboard</Link><p className="mt-8">{state.error}</p></main>;
  const p = state.profile;
  return (
    <main className="min-h-screen bg-[#0b1220] px-5 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link to="/leaderboard" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-orange-400 hover:text-orange-300 transition">
            ← Back to Leaderboard
          </Link>
          {p.isOwner && (
            <Link to="/profile" className="text-xs font-extrabold text-amber-300 hover:text-amber-200 transition">
              Go to Dashboard →
            </Link>
          )}
        </div>

        {p.isOwner && (
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">👁️</span>
              <div>
                <p className="text-xs font-black text-amber-200">Owner Preview Mode</p>
                <p className="text-[11px] text-amber-300/80">
                  {p.private
                    ? "Your profile is set to PRIVATE. Other students and recruiters see this locked screen."
                    : "Your profile is set to PUBLIC. Other students see your featured projects and public stats."}
                </p>
              </div>
            </div>
            <Link
              to="/profile"
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition shrink-0"
            >
              Edit in Dashboard
            </Link>
          </div>
        )}

        <header className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#111927]">
          <div className="h-32 bg-[#1b2438] bg-cover bg-center" style={p.cover ? { backgroundImage: `url(${p.cover})` } : undefined} />
          <div className="px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="-mt-12 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-[#111927] bg-orange-500 text-2xl font-black text-slate-950 shadow-xl">
                {p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover"/> : p.name?.slice(0, 1)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-black text-white">{p.name}</h1>
                  {p.private && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-500/15 px-2.5 py-0.5 text-xs font-black text-orange-300">
                      <Lock size={12} /> Private
                    </span>
                  )}
                </div>
                {!p.private && (
                  <p className="mt-1 text-sm font-medium text-slate-400">
                    {p.college?.name || "College not listed"}{p.branch ? ` · ${p.branch}` : ""}
                  </p>
                )}
              </div>
            </div>
            {!p.private && p.activityPrivacy?.streakStatsVisible && p.leaderboard?.streakDays != null && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Stat label="Current streak" value={`${p.leaderboard.streakDays} days`} />
                <Stat label="Longest streak" value={`${p.leaderboard.longestStreak} days`} />
              </div>
            )}
          </div>
        </header>

        {p.private ? (
          <section className="mt-6 rounded-2xl border border-white/10 bg-[#111927] p-10 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10 text-orange-400">
              <Lock size={26} />
            </div>
            <h2 className="mt-4 text-xl font-black text-white">{p.message || "This profile is private."}</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
              This student has set their profile visibility to private. Only their name and display avatar are publicly accessible.
            </p>
          </section>
        ) : (
          <PublicSections profile={p} />
        )}
      </div>
    </main>
  );
}

function PublicSections({ profile: p }) {
  const links = [["LinkedIn", p.linkedin?.url], ["GitHub", p.github?.url], ["LeetCode", p.leetcode?.url]].filter(([, url]) => url);
  return (
    <div className="mt-6 grid gap-6">
      {links.length > 0 && (
        <Section title="Profile Links">
          <div className="flex flex-wrap gap-3">
            {links.map(([label, url]) => (
              <a key={label} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-3.5 py-2 text-xs font-extrabold text-orange-200 hover:border-orange-300 hover:text-orange-100 transition">
                {label} <ExternalLink size={14}/>
              </a>
            ))}
          </div>
        </Section>
      )}
      <MomentumSection activityCalendar={p.activityCalendar || []} lastSyncedAt={p.leaderboard?.lastSyncedAt} currentStreak={p.leaderboard?.streakDays || 0} longestStreak={p.leaderboard?.longestStreak || 0} ownerName={p.name} heatmapVisible={p.activityPrivacy?.heatmapVisible !== false} streakStatsVisible={p.activityPrivacy?.streakStatsVisible !== false}/>
      <StreakLeaderboardPreview snapshot={p.streakLeaderboard} ownerName={p.name}/>
      {p.projects && (
        p.projects.featured?.length > 0 ? (
          <PublicFeaturedProjects projects={p.projects.featured}/>
        ) : (
          <Section title="Featured Projects">
            <p className="text-sm text-slate-400">No public featured projects pinned yet.</p>
          </Section>
        )
      )}
      {p.about && <Section title="About"><p className="text-sm leading-7 text-slate-300">{p.about.bio || "No bio added."}</p></Section>}
      {p.skills && <Section title="Skills"><div className="flex flex-wrap gap-2">{p.skills.length ? p.skills.map((skill) => <span key={skill} className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">{skill}</span>) : <p className="text-sm text-slate-400">No public skills listed.</p>}</div></Section>}
      <div className="grid gap-6 md:grid-cols-2">
        {p.github && <Section title="GitHub"><Integration connected={p.github.connected} lines={p.github.connected ? [`@${p.github.username}`, `${p.github.publicRepos} public repositories`, `${p.github.followers} followers`, p.github.metricAvailable ? `${p.github.activityToday} verified activities today${p.github.commitsToday ? ` · ${p.github.commitsToday} commits` : ""}` : "Refresh required for activity"] : []}/></Section>}
        {p.leetcode && <Section title="LeetCode"><Integration connected={p.leetcode.connected} lines={p.leetcode.connected ? [`@${p.leetcode.username}`, `${p.leetcode.totalSolved} total solved`, p.leetcode.metricAvailable ? `${p.leetcode.acceptedToday} accepted problems today` : "Refresh required for accepted-problem activity"] : []}/></Section>}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {p.education && <Section title="Education"><p className="font-bold text-white">{p.education.graduationYear ? `Class of ${p.education.graduationYear}` : "Graduation year not listed"}</p>{p.education.cgpa != null && <p className="mt-1 text-sm text-slate-400">CGPA {p.education.cgpa}</p>}</Section>}
        {p.careerGoal && <Section title="Career Goal"><p className="font-bold text-white">{p.careerGoal.role || "Not listed"}</p></Section>}
      </div>
    </div>
  );
}

function PublicFeaturedProjects({ projects }) {
  return (
    <Section title="Featured Projects">
      <div className="grid gap-4 md:grid-cols-3">
        {projects.slice(0, 3).map((project) => (
          <article key={project.id} className="flex min-h-48 flex-col justify-between rounded-xl border border-white/10 bg-[#111a2b] p-4 hover:border-white/20 transition">
            <div>
              <p className="text-base font-black text-white">{project.name}</p>
              {project.evidenceLabel && (
                <span className="mt-1 inline-block text-[11px] font-extrabold text-orange-400">
                  {project.evidenceLabel}
                </span>
              )}
              {project.description && (
                <p className="mt-2.5 line-clamp-3 text-xs leading-5 text-slate-400">
                  {project.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.technologies.map((technology) => (
                  <span key={technology} className="rounded-md bg-white/[.06] px-2 py-0.5 text-[11px] font-bold text-slate-300">
                    {technology}
                  </span>
                ))}
              </div>
            </div>
            {(project.repoUrl || project.liveUrl) && (
              <div className="mt-4 flex gap-3 border-t border-white/10 pt-3">
                {project.repoUrl && (
                  <a href={project.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-300 hover:text-orange-200 transition">
                    <Github size={14}/> GitHub
                  </a>
                )}
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-300 hover:text-orange-200 transition">
                    <Globe size={14}/> Live demo
                  </a>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}

function PublicProfileLoading() { return <main className="min-h-screen bg-[#0b1220] px-5 py-12"><div className="mx-auto max-w-5xl animate-pulse space-y-6"><div className="h-52 rounded-2xl bg-white/10"/><div className="h-96 rounded-2xl bg-white/10"/><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="aspect-square rounded-xl bg-white/10"/>)}</div></div></main>; }
function Section({ title, children }) { return <section className="rounded-2xl border border-white/10 bg-[#111927] p-6 shadow-md"><h2 className="text-xs font-black uppercase tracking-widest text-orange-400">{title}</h2><div className="mt-4">{children}</div></section>; }
function Integration({ connected, lines }) { if (!connected) return <p className="text-sm text-slate-400">Not connected</p>; return <div className="space-y-1">{lines.map((line) => <p key={line} className="text-sm font-semibold text-slate-300">{line}</p>)}</div>; }
function Stat({ label, value }) { return <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-base font-extrabold text-white">{value}</p></div>; }
