import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAlumniCareerDNA, compareWithAlumni } from '../Services/careerDNAService';
import useAuth from '../hook/useAuth';

const PLATFORM_ICONS = { GITHUB: '🐙', LEETCODE: '💻', CODEFORCES: '🏆', CODECHEF: '👨‍🍳', GEEKSFORGEEKS: '🟢', HACKERRANK: '💚', HACKEREARTH: '🌍', CODE360: '🔷', KAGGLE: '📊', STACK_OVERFLOW: '📚', GITLAB: '🦊', PORTFOLIO: '🌐', LINKEDIN: '🔗', BEHANCE: '🎨', DRIBBBLE: '🏀', ATCODER: '⚡', INTERVIEWBIT: '📝', OTHER: '🔗' };
const LEVEL_COLORS = { ADVANCED: 'bg-green-500/20 text-green-400 border-green-500/30', INTERMEDIATE: 'bg-blue-500/20 text-blue-400 border-blue-500/30', BEGINNER: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
const CAT_COLORS = { LANGUAGE: 'bg-purple-500/20 text-purple-300', FRONTEND: 'bg-cyan-500/20 text-cyan-300', BACKEND: 'bg-orange-500/20 text-orange-300', DATABASE: 'bg-emerald-500/20 text-emerald-300', CLOUD: 'bg-sky-500/20 text-sky-300', DEVOPS: 'bg-amber-500/20 text-amber-300', AI_ML: 'bg-pink-500/20 text-pink-300', CORE_CS: 'bg-indigo-500/20 text-indigo-300', SYSTEM_DESIGN: 'bg-teal-500/20 text-teal-300', OTHER: 'bg-slate-500/20 text-slate-300' };

function Skeleton({ className = '' }) { return <div className={`animate-pulse rounded bg-slate-700/50 ${className}`} />; }

export default function CareerDNA() {
  const { alumniId } = useParams();
  const { isAuthenticated } = useAuth();
  const [dna, setDna] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => { let cancelled = false;
    setLoading(true); setError(null);
    getAlumniCareerDNA(alumniId).then(r => { if (!cancelled) setDna(r.data); }).catch(e => { if (!cancelled) setError(e.response?.data?.message || 'Failed to load Career DNA.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [alumniId]);

  const handleCompare = useCallback(async () => {
    if (comparing) return; setComparing(true);
    try { const r = await compareWithAlumni(alumniId); setComparison(r.data); } catch { setComparison({ error: true }); } finally { setComparing(false); }
  }, [alumniId, comparing]);

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-8"><Skeleton className="h-8 w-64 mb-6" /><div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}</div><Skeleton className="mt-6 h-64" /></main>;
  if (error) return <main className="mx-auto max-w-5xl px-4 py-16 text-center"><p className="text-red-400 text-lg font-semibold">{error}</p><Link to={`/alumni-wall/${alumniId}`} className="mt-4 inline-block text-orange-400 hover:underline">← Back to profile</Link></main>;
  if (!dna) return null;

  const { identity, career, coding, skillsAtSelection, projects, preparation, practiceProfiles, verificationSummary, evidenceSummary } = dna;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-20">
      {/* Back nav */}
      <Link to={`/alumni-wall/${alumniId}`} className="text-sm text-slate-400 hover:text-orange-400 transition-colors mb-4 inline-block">← Back to Alumni Profile</Link>

      {/* Identity Header */}
      <header className="rounded-xl p-6 mb-6" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
        <div className="flex items-center gap-4">
          {identity.avatarUrl ? <img src={identity.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-orange-500/50" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20 text-2xl font-bold text-orange-400">{(identity.name || '?')[0]}</div>}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary, #f1f5f9)' }}>{identity.name}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary, #94a3b8)' }}>{identity.branch} • {identity.college} • Batch {identity.batch}</p>
            {career.company && <p className="mt-1 text-sm font-medium text-orange-400">{career.role} @ {career.company}{career.package ? ` • ${career.package} LPA` : ''}</p>}
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-400 border border-orange-500/30">🧬 Career DNA</span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 mb-6 overflow-x-auto rounded-lg p-1" style={{ background: 'var(--card-bg, #1e293b)' }}>
        {['overview', 'skills', 'coding', 'projects', 'preparation'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:text-slate-200'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </nav>

      {tab === 'overview' && <OverviewTab dna={dna} onCompare={handleCompare} comparing={comparing} comparison={comparison} isAuthenticated={isAuthenticated} />}
      {tab === 'skills' && <SkillsTab skillsAtSelection={skillsAtSelection} currentVerifiedSkills={dna.currentVerifiedSkills} />}
      {tab === 'coding' && <CodingTab coding={coding} practiceProfiles={practiceProfiles} />}
      {tab === 'projects' && <ProjectsTab projects={projects} />}
      {tab === 'preparation' && <PreparationTab preparation={preparation} />}
    </main>
  );
}

function OverviewTab({ dna, onCompare, comparing, comparison, isAuthenticated }) {
  const { practiceProfiles, verificationSummary, evidenceSummary, skillsAtSelection, coding } = dna;
  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'Skills at Selection', value: skillsAtSelection.length, icon: '🎯' },
          { label: 'DSA Solved', value: coding.dsa.solvedAtSelection ?? '—', icon: '📊' },
          { label: 'Projects', value: dna.projects.length, icon: '🛠️' },
          { label: 'Platforms', value: practiceProfiles.length, icon: '🔗' },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-4 text-center" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
            <span className="text-2xl">{s.icon}</span>
            <p className="mt-1 text-2xl font-bold text-orange-400">{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Practice Profiles */}
      {practiceProfiles.length > 0 && (
        <section className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary, #f1f5f9)' }}>Connected Platforms</h2>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {practiceProfiles.map((p, i) => (
              <a key={i} href={p.profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-700/50" style={{ border: '1px solid var(--border, #334155)' }}>
                <span className="text-xl">{PLATFORM_ICONS[p.platform] || '🔗'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary, #f1f5f9)' }}>{p.platformLabel || p.platform}</p>
                  {p.username && <p className="text-xs truncate" style={{ color: 'var(--text-secondary, #94a3b8)' }}>@{p.username}</p>}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Evidence summary */}
      <section className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary, #f1f5f9)' }}>Evidence Summary</h2>
        <div className="space-y-2">
          {evidenceSummary.evidenceFound.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${e.type.includes('VERIFIED') ? 'bg-green-400' : 'bg-blue-400'}`} />
              <span style={{ color: 'var(--text-primary, #f1f5f9)' }}>{e.detail}</span>
            </div>
          ))}
          {!evidenceSummary.evidenceFound.length && <p className="text-sm text-slate-500">No verified evidence available yet.</p>}
        </div>
      </section>

      {/* Comparison */}
      {isAuthenticated && (
        <section className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary, #f1f5f9)' }}>Compare With This Senior</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary, #94a3b8)' }}>See how your profile compares against this senior's <strong>skills at selection time</strong> — not their current abilities.</p>
          {!comparison ? (
            <button onClick={onCompare} disabled={comparing} className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-orange-400 disabled:opacity-50 transition-colors">{comparing ? 'Comparing...' : '🔍 Compare My Profile'}</button>
          ) : comparison.error ? (
            <p className="text-red-400 text-sm">Complete your profile first to compare.</p>
          ) : (
            <ComparisonResult data={comparison} />
          )}
        </section>
      )}
    </div>
  );
}

function ComparisonResult({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-3xl font-bold text-orange-400">{data.matchPercentage}%</div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary, #f1f5f9)' }}>Skill Overlap (at selection)</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Based on skills the senior had when selected</p>
        </div>
      </div>
      {/* Dimensions */}
      <div className="grid gap-3 md:grid-cols-3">
        {data.dimensions.map(d => (
          <div key={d.key} className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border, #334155)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary, #94a3b8)' }}>{d.label}</p>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-primary, #f1f5f9)' }}>You: <strong>{d.student.display}</strong></span>
              <span className="text-orange-400">Senior: <strong>{d.alumni.display}</strong></span>
            </div>
          </div>
        ))}
      </div>
      {/* Skills */}
      {data.matchedSkills?.length > 0 && (
        <div><p className="text-xs font-bold text-green-400 mb-1">✓ Shared Skills</p><div className="flex flex-wrap gap-1">{data.matchedSkills.map(s => <span key={s} className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-400 border border-green-500/30">{s}</span>)}</div></div>
      )}
      {data.missingSkills?.length > 0 && (
        <div><p className="text-xs font-bold text-amber-400 mb-1">⚡ Skills to Build</p><div className="flex flex-wrap gap-1">{data.missingSkills.map(s => <span key={s} className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400 border border-amber-500/30">{s}</span>)}</div></div>
      )}
      {/* Gaps */}
      {data.gaps?.length > 0 && (
        <div className="space-y-1.5 mt-2">{data.gaps.map((g, i) => <div key={i} className="flex items-start gap-2 text-sm"><span className="text-amber-400 mt-0.5">→</span><span style={{ color: 'var(--text-primary, #f1f5f9)' }}><strong>{g.area}:</strong> {g.detail}</span></div>)}</div>
      )}
    </div>
  );
}

function SkillsTab({ skillsAtSelection, currentVerifiedSkills }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary, #f1f5f9)' }}>Skills When Selected</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Skills the senior had at placement/selection time — this is what you should aim for.</p>
        {skillsAtSelection.length ? (
          <div className="flex flex-wrap gap-2">{skillsAtSelection.map((s, i) => (
            <div key={i} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm border ${LEVEL_COLORS[s.level] || LEVEL_COLORS.BEGINNER}`}>
              <span className="font-medium">{s.name}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${CAT_COLORS[s.category] || CAT_COLORS.OTHER}`}>{s.category}</span>
            </div>
          ))}</div>
        ) : <p className="text-sm text-slate-500">No skills data available.</p>}
      </section>
      {currentVerifiedSkills?.length > 0 && (
        <section className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary, #f1f5f9)' }}>Current Verified Skills</h2>
          <div className="flex flex-wrap gap-2">{currentVerifiedSkills.map((s, i) => (
            <span key={i} className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400 border border-emerald-500/30">{s.name}</span>
          ))}</div>
        </section>
      )}
    </div>
  );
}

function CodingTab({ coding, practiceProfiles }) {
  return (
    <div className="space-y-6">
      {/* DSA */}
      <section className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary, #f1f5f9)' }}>DSA Profile</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Stat label="Solved at Selection" value={coding.dsa.solvedAtSelection} note={coding.dsa.estimated ? '(estimate)' : ''} />
          <Stat label="Current Solved" value={coding.dsa.currentSolved} />
          <Stat label="Contest Rating" value={coding.dsa.contestRating} />
          <Stat label="Primary Language" value={coding.dsa.primaryLanguage} />
        </div>
        {(coding.dsa.strongTopics?.length > 0 || coding.dsa.weakTopics?.length > 0) && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {coding.dsa.strongTopics?.length > 0 && <div><p className="text-xs font-bold text-green-400 mb-1">Strong Topics</p><div className="flex flex-wrap gap-1">{coding.dsa.strongTopics.map(t => <span key={t} className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-400">{t}</span>)}</div></div>}
            {coding.dsa.weakTopics?.length > 0 && <div><p className="text-xs font-bold text-amber-400 mb-1">Weak Topics</p><div className="flex flex-wrap gap-1">{coding.dsa.weakTopics.map(t => <span key={t} className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">{t}</span>)}</div></div>}
          </div>
        )}
      </section>

      {/* GitHub */}
      {coding.github && (
        <section className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary, #f1f5f9)' }}>🐙 GitHub</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Username" value={coding.github.username} link={coding.github.profileUrl} />
            <Stat label="Public Repos" value={coding.github.publicRepos} />
            <Stat label="Verified" value={coding.github.verified ? '✓ Yes' : 'Pending'} />
          </div>
          {coding.github.languages?.length > 0 && <div className="mt-3"><p className="text-xs font-bold mb-1" style={{ color: 'var(--text-secondary, #94a3b8)' }}>Top Languages</p><div className="flex flex-wrap gap-1">{coding.github.languages.map(l => <span key={l} className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs text-purple-400">{l}</span>)}</div></div>}
        </section>
      )}

      {/* Competitive Programming */}
      {coding.competitiveProgramming?.length > 0 && (
        <section className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary, #f1f5f9)' }}>🏆 Competitive Programming</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {coding.competitiveProgramming.map((p, i) => (
              <a key={i} href={p.profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-slate-700/50" style={{ border: '1px solid var(--border, #334155)' }}>
                <span className="text-xl">{PLATFORM_ICONS[p.platform] || '🏆'}</span>
                <div><p className="font-medium text-sm" style={{ color: 'var(--text-primary, #f1f5f9)' }}>{p.platformLabel}</p><p className="text-xs" style={{ color: 'var(--text-secondary, #94a3b8)' }}>@{p.username}</p></div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* All Profiles */}
      {practiceProfiles?.length > 0 && (
        <section className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary, #f1f5f9)' }}>All Connected Platforms</h2>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {practiceProfiles.map((p, i) => (
              <a key={i} href={p.profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-700/50" style={{ border: '1px solid var(--border, #334155)' }}>
                <span>{PLATFORM_ICONS[p.platform] || '🔗'}</span>
                <span className="truncate" style={{ color: 'var(--text-primary, #f1f5f9)' }}>{p.platformLabel || p.platform}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProjectsTab({ projects }) {
  if (!projects?.length) return <div className="rounded-xl p-8 text-center" style={{ background: 'var(--card-bg, #1e293b)' }}><p className="text-slate-500">No projects documented.</p></div>;
  return (
    <div className="space-y-3">
      {projects.map((p, i) => (
        <article key={i} className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold" style={{ color: 'var(--text-primary, #f1f5f9)' }}>{p.name}</h3>
              {p.description && <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-secondary, #94a3b8)' }}>{p.description}</p>}
            </div>
            <div className="flex gap-1.5 shrink-0">
              {p.onResume && <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-400 border border-blue-500/30">📄 Resume</span>}
              {p.discussedInInterview && <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] text-green-400 border border-green-500/30">🎙 Interview</span>}
            </div>
          </div>
          {(Array.isArray(p.techStack) ? p.techStack : []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">{p.techStack.map((t, j) => <span key={j} className="rounded-full bg-slate-600/50 px-2 py-0.5 text-xs" style={{ color: 'var(--text-secondary, #94a3b8)' }}>{t}</span>)}</div>
          )}
          <div className="flex gap-3 mt-3">
            {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 hover:underline">🐙 GitHub</a>}
            {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline">🌐 Live</a>}
          </div>
        </article>
      ))}
    </div>
  );
}

function PreparationTab({ preparation }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary, #f1f5f9)' }}>Preparation Overview</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Duration" value={preparation.months ? `${preparation.months} months` : null} />
          <Stat label="Hours/Day" value={preparation.hoursPerDay} />
          <Stat label="Started In" value={preparation.startedIn?.replace('_', ' ')} />
        </div>
      </section>

      {preparation.phases?.length > 0 && (
        <section className="rounded-xl p-5" style={{ background: 'var(--card-bg, #1e293b)', border: '1px solid var(--border, #334155)' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary, #f1f5f9)' }}>Preparation Timeline</h2>
          <div className="relative pl-6 space-y-6">
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-orange-500/30" />
            {preparation.phases.map((phase, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-4 top-1.5 h-3 w-3 rounded-full bg-orange-500 ring-4 ring-orange-500/20" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium" style={{ color: 'var(--text-primary, #f1f5f9)' }}>{phase.title}</h3>
                    {phase.duration && <span className="text-xs rounded-full bg-slate-600/50 px-2 py-0.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>{phase.duration}</span>}
                  </div>
                  {phase.description && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary, #94a3b8)' }}>{phase.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, note, link }) {
  const display = value != null && value !== '' ? String(value) : '—';
  return (
    <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary, #94a3b8)' }}>{label}</p>
      {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-orange-400 hover:underline">{display}</a> : <p className="text-sm font-semibold" style={{ color: 'var(--text-primary, #f1f5f9)' }}>{display}{note && <span className="text-xs text-slate-500 ml-1">{note}</span>}</p>}
    </div>
  );
}
