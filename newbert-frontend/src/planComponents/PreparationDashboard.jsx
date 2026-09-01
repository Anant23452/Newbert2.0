import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, CircleHelp, Clock3, ExternalLink, GitBranch, RefreshCw, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const Motion = motion;
const positionLabel = { strong: "Strong", developing: "Developing", weak_evidence: "Weak evidence", unknown: "Unknown" };
const readinessLabel = { insufficient_evidence: "Needs more evidence", early: "Early", building: "Building", near_target: "Near target", target_ready: "Target ready" };
const gapLabel = { target_gap: "Target gap", knowledge_gap: "Knowledge gap", evidence_gap: "Evidence gap" };
const importanceTone = { critical: "bg-red-400/10 text-red-200", high: "bg-orange-400/10 text-orange-200", medium: "bg-sky-400/10 text-sky-200", low: "bg-slate-400/10 text-slate-300" };
const positionTone = { strong: "bg-emerald-400", developing: "bg-orange-400", weak_evidence: "bg-amber-300", unknown: "bg-slate-600" };

function safeList(value) { return Array.isArray(value) ? value : []; }
function titleCase(value) { return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value) { if (!value) return "Not available"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString(undefined, { month: "short", year: "numeric" }); }

export default function PreparationDashboard({ plan, busyMilestone, recalculating, aiExplanation, aiLoading, aiError, onExplainPlan, onMilestoneStatus, onChangeGoal, onRecalculate }) {
  const [drawer, setDrawer] = useState(null);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const current = new Map(safeList(plan.currentPosition?.categories).map((item) => [item.key, item]));
  const milestones = safeList(plan.milestones).filter((item) => !item.archived);
  const phases = safeList(plan.strategyPhases);
  const nextMilestone = milestones.find((item) => item.status === "in_progress") || milestones.find((item) => item.status === "not_started") || null;
  const understood = plan.understoodCurrentStage || {};

  return <main className="min-h-screen bg-[#0b1220] px-4 py-8 text-white sm:px-6 lg:py-12">
    <div className="mx-auto max-w-6xl space-y-6">
      {plan.recalculated && <Notice tone="emerald">Strategy refreshed. Completed milestones and previous history were preserved.</Notice>}
      {plan.needsRecalculation && <Notice tone="orange">Your evidence changed. Refresh the strategy when you are ready to review updated priorities.</Notice>}

      <TargetHeader plan={plan} recalculating={recalculating} onChangeGoal={onChangeGoal} onRecalculate={onRecalculate}/>

      {plan.targetBenchmark?.fallbackMessage && <Notice tone="slate">{plan.targetBenchmark.fallbackMessage}</Notice>}

      <Section eyebrow="Target expectations" title="What this target expects" detail="Importance comes from the strongest evidence Newbert currently has. Open any row to see why.">
        <div className="overflow-hidden rounded-lg bg-[#101a2c]">
          <div className="hidden grid-cols-[1.4fr_.7fr_.8fr_44px] gap-4 border-b border-white/8 px-5 py-3 text-[11px] font-bold uppercase text-slate-500 md:grid">
            <span>Category</span><span>Importance</span><span>Your position</span><span/>
          </div>
          {safeList(plan.targetBenchmark?.categories).length ? safeList(plan.targetBenchmark.categories).map((category) => {
            const mine = current.get(category.key) || { position: "unknown", evidenceKind: "unknown" };
            return <button type="button" key={category.key} onClick={() => setDrawer({ category, current: mine })} className="grid w-full gap-3 border-b border-white/8 px-5 py-4 text-left last:border-0 hover:bg-white/[.035] md:grid-cols-[1.4fr_.7fr_.8fr_44px] md:items-center">
              <div><p className="font-bold text-slate-100">{category.label}</p><p className="mt-1 line-clamp-1 text-xs text-slate-500">{category.reason}</p></div>
              <div><span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold capitalize ${importanceTone[category.importance] || importanceTone.medium}`}>{category.importance}</span></div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-300"><span className={`h-2 w-2 rounded-sm ${positionTone[mine.position] || positionTone.unknown}`}/>{positionLabel[mine.position] || "Unknown"}</div>
              <CircleHelp className="h-4 w-4 text-slate-500" aria-hidden="true"/>
            </button>;
          }) : <Empty title="No target benchmark yet" detail="Refresh the strategy or choose a supported role. Newbert will not invent company requirements."/>}
        </div>
      </Section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <CurrentPosition plan={plan} understood={understood}/>
        <Blockers blockers={plan.biggestBlockers}/>
      </section>

      <NextAction milestone={nextMilestone} busy={busyMilestone} onStatus={onMilestoneStatus}/>

      <Section eyebrow="Preparation path" title="Milestones, not a forced daily schedule" detail="Move through the highest-value gaps. Completion rules only use evidence Newbert can actually verify.">
        {phases.length ? <div className="relative space-y-5 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-white/10">
          {phases.map((phase, phaseIndex) => <Motion.div key={phase.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ delay: phaseIndex * .04 }} className="relative grid gap-4 pl-11 lg:grid-cols-[240px_1fr]">
            <span className="absolute left-2 top-5 grid h-5 w-5 place-items-center rounded-sm bg-orange-400 text-[10px] font-black text-slate-950">{phaseIndex + 1}</span>
            <div className="pt-3"><p className="text-xs font-bold uppercase text-orange-300">Phase {phaseIndex + 1}</p><h3 className="mt-1 text-lg font-black">{phase.title}</h3></div>
            <div className="space-y-3">{milestones.filter((item) => item.phaseId === phase.id).map((milestone) => <Milestone key={milestone.id} milestone={milestone} busy={busyMilestone === milestone.id} onStatus={onMilestoneStatus} onWhy={() => setDrawer({ milestone })}/>)}</div>
          </Motion.div>)}
        </div> : <Empty title="Your strategy needs more information" detail="Connect evidence or add project details so Newbert can identify a defensible next milestone."/>}
      </Section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SeniorBenchmark match={plan.seniorMatch} group={plan.seniorBenchmarkGroup} target={plan.target}/>
        <Understanding understood={understood} profileSnapshot={plan.profileSnapshot}/>
      </section>

      <Explanation explanation={aiExplanation} loading={aiLoading} error={aiError} onExplain={onExplainPlan}/>
      <WeeklyPlan plan={plan} milestones={milestones} open={weeklyOpen} onToggle={() => setWeeklyOpen((value) => !value)}/>
    </div>
    <AnimatePresence>{drawer && <EvidenceDrawer value={drawer} onClose={() => setDrawer(null)}/>}</AnimatePresence>
  </main>;
}

function TargetHeader({ plan, recalculating, onChangeGoal, onRecalculate }) {
  const benchmark = plan.targetBenchmark || {};
  const evidence = benchmark.evidenceSummary || {};
  const targetName = plan.target.company || (plan.target.companyCategory ? `${titleCase(plan.target.companyCategory)} company` : "Role-level benchmark");
  return <header className="overflow-hidden rounded-lg bg-[#111c30] shadow-2xl shadow-black/20">
    <div className="grid gap-7 p-6 md:p-8 lg:grid-cols-[1.25fr_.75fr]">
      <div><div className="flex items-center gap-2 text-xs font-black uppercase text-orange-300"><Target className="h-4 w-4"/> My target</div><h1 className="mt-4 text-3xl font-black md:text-5xl">{plan.target.role}</h1><p className="mt-3 text-lg font-semibold text-slate-300">{targetName}{plan.target.region ? ` · ${plan.target.region}` : ""}</p>
        <div className="mt-6 flex flex-wrap gap-2"><Pill>{titleCase(plan.targetConfidence || "exploratory")} benchmark</Pill><Pill>{readinessLabel[plan.overallReadiness] || "Needs evidence"}</Pill>{plan.target.deadline && <Pill>Target {formatDate(plan.target.deadline)}</Pill>}{plan.target.weeklyHours && <Pill>{plan.target.weeklyHours} hrs/week</Pill>}</div>
      </div>
      <div className="rounded-lg bg-[#0b1425] p-5"><p className="text-xs font-black uppercase text-slate-500">Evidence behind this strategy</p><div className="mt-4 grid grid-cols-2 gap-4 text-sm"><EvidenceCount label="Current JDs" value={evidence.officialJobs}/><EvidenceCount label="Verified alumni" value={evidence.verifiedAlumni}/><EvidenceCount label="Public reports" value={evidence.publicSignals}/><EvidenceCount label="Refreshed" value={formatDate(benchmark.lastRefreshedAt)}/></div><p className="mt-4 text-xs leading-5 text-slate-500">Role baselines are fallback guidance. Public research is not counted unless a traceable provider is configured.</p></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 bg-black/15 px-6 py-4 md:px-8"><p className="text-xs text-slate-400">Evidence → gaps → priorities → milestones → new evidence</p><div className="flex gap-2"><button type="button" onClick={onRecalculate} disabled={recalculating} className="inline-flex items-center gap-2 rounded-md bg-white/8 px-3 py-2 text-xs font-bold hover:bg-white/12 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`}/>{recalculating ? "Refreshing" : "Refresh"}</button><button type="button" onClick={onChangeGoal} className="rounded-md bg-orange-400 px-3 py-2 text-xs font-black text-slate-950">Change target</button></div></div>
  </header>;
}

function CurrentPosition({ plan, understood }) {
  const categories = safeList(plan.currentPosition?.categories);
  const known = categories.filter((item) => item.position !== "unknown");
  return <Section eyebrow="Your current position" title="What Newbert can support" compact>
    <div className="mt-5 space-y-4">{known.length ? known.slice(0, 6).map((item) => <div key={item.key}><div className="flex items-center justify-between gap-4 text-sm"><span className="font-semibold text-slate-200">{item.label}</span><span className="text-xs font-bold text-slate-400">{positionLabel[item.position]} · {titleCase(item.evidenceKind)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-sm bg-white/8"><Motion.div initial={{ width: 0 }} animate={{ width: item.position === "strong" ? "100%" : item.position === "developing" ? "62%" : "28%" }} className={`h-full ${positionTone[item.position]}`}/></div></div>) : <p className="text-sm leading-6 text-slate-400">Newbert needs connected activity, project details, or an assessment before it can describe your strengths responsibly.</p>}</div>
    {safeList(understood.strengths).length > 0 && <p className="mt-5 text-xs leading-5 text-slate-500">Your own context also mentions: {safeList(understood.strengths).join(", ")}.</p>}
  </Section>;
}

function Blockers({ blockers }) { return <Section eyebrow="Biggest blockers" title="The three highest-value gaps" compact><div className="mt-5 space-y-3">{safeList(blockers).length ? safeList(blockers).map((gap, index) => <article key={gap.id} className="flex gap-4 rounded-lg bg-[#0c1526] p-4"><span className="text-2xl font-black text-orange-400">{index + 1}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{gap.label}</h3><span className="rounded-md bg-orange-400/10 px-2 py-1 text-[10px] font-black uppercase text-orange-200">{gapLabel[gap.gapType]}</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{gap.reason}</p></div></article>) : <Empty title="No high-priority blocker is supported yet" detail="This can mean either you are caught up or Newbert needs more evidence. Review the current-position section before assuming readiness."/>}</div></Section>; }

function NextAction({ milestone, busy, onStatus }) {
  if (!milestone) return <section className="rounded-lg bg-emerald-400/10 p-6"><p className="text-xs font-black uppercase text-emerald-300">Next best action</p><h2 className="mt-2 text-2xl font-black">You are caught up on the current strategy.</h2><p className="mt-2 text-sm text-slate-300">Refresh after your evidence or target changes. This is not a placement guarantee.</p></section>;
  return <section className="rounded-lg bg-gradient-to-r from-orange-400/15 via-[#121d31] to-[#121d31] p-6 md:p-7"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-xs font-black uppercase text-orange-300">Next best action</p><h2 className="mt-2 text-2xl font-black">{milestone.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{milestone.whatRemains}</p></div><button type="button" disabled={busy || milestone.status === "in_progress"} onClick={() => onStatus(milestone, "in_progress")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-orange-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{milestone.status === "in_progress" ? "In progress" : "Open milestone"}<ArrowRight className="h-4 w-4"/></button></div></section>;
}

function Milestone({ milestone, busy, onStatus, onWhy }) { return <article className="rounded-lg bg-[#111c30] p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-black">{milestone.title}</h4><span className="rounded-md bg-white/8 px-2 py-1 text-[10px] font-black uppercase text-slate-300">{gapLabel[milestone.gapType] || milestone.classification}</span></div><p className="mt-2 text-sm leading-6 text-slate-400">{milestone.what}</p></div><select aria-label={`Status for ${milestone.title}`} value={milestone.status || "not_started"} disabled={busy} onChange={(event) => onStatus(milestone, event.target.value)} className="rounded-md bg-[#0b1425] px-3 py-2 text-xs font-bold text-white outline-none ring-1 ring-white/10"><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="skipped">Skipped</option></select></div><div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2"><p><strong className="text-slate-200">Current:</strong> {titleCase(milestone.currentState)}</p><p><strong className="text-slate-200">Target:</strong> {titleCase(milestone.targetState)}</p><p className="sm:col-span-2"><strong className="text-slate-200">Done when:</strong> {milestone.doneWhen}</p><p><strong className="text-slate-200">Effort:</strong> {milestone.estimatedEffort}</p><button type="button" onClick={onWhy} className="justify-self-start font-bold text-orange-300">Why this milestone?</button></div></article>; }

function SeniorBenchmark({ match, group, target }) {
  if (!match) return <Section eyebrow="Senior benchmark" title="No verified comparable senior yet" compact><p className="mt-4 text-sm leading-6 text-slate-400">The strategy continues using target evidence and your profile. Newbert did not create a fictional senior.</p><Link to="/alumni-wall" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-orange-300">Browse verified alumni <ArrowRight className="h-4 w-4"/></Link></Section>;
  const breakdown = match.breakdown || {};
  const exactCompany = Boolean(target.company) && String(match.senior.company || "").toLowerCase() === String(target.company).toLowerCase();
  return <Section eyebrow="Senior benchmark" title={match.senior.name} compact><p className="mt-1 text-sm text-slate-400">{match.senior.company} · {match.senior.role || "Recorded outcome"}</p><span className="mt-4 inline-flex rounded-md bg-orange-400/10 px-2.5 py-1 text-xs font-bold text-orange-200">{exactCompany ? "Exact-company signal" : "Similar-path benchmark"}</span><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><MatchFact label="Same college" active={breakdown.collegeBranch === 100 || breakdown.sameCollege === 100}/><MatchFact label="Same role family" active={breakdown.role === 100 || breakdown.sameTargetRole === 100}/><MatchFact label="Skill overlap" active={Boolean(match.matchedSkills?.length)}/><MatchFact label="Same company" active={exactCompany}/></div>{safeList(group?.commonSkills).length > 0 && <div className="mt-5"><p className="text-[11px] font-black uppercase text-slate-500">Common in {group.cohortSize} closest verified profiles</p><div className="mt-2 flex flex-wrap gap-2">{safeList(group.commonSkills).slice(0, 4).map((item) => <span key={item.skill} className="rounded-md bg-white/8 px-2 py-1 text-xs font-bold text-slate-300">{item.skill} · {item.percent}%</span>)}</div></div>}<Link to={`/alumni-wall/${match.senior.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-orange-300">View senior evidence <ExternalLink className="h-4 w-4"/></Link></Section>;
}

function Understanding({ understood, profileSnapshot }) { const items = [safeList(understood.completed).length && { icon: <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300"/>, text: `${safeList(understood.completed).slice(0, 3).join(", ")} recorded as completed` }, profileSnapshot?.github ? { icon: <GitBranch className="mt-1 h-4 w-4 shrink-0 text-emerald-300"/>, text: `GitHub @${profileSnapshot.github.username} connected` } : { icon: <GitBranch className="mt-1 h-4 w-4 shrink-0 text-amber-300"/>, text: "GitHub evidence unavailable" }, profileSnapshot?.leetcode ? { icon: <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-300"/>, text: `LeetCode @${profileSnapshot.leetcode.username} connected` } : { icon: <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-amber-300"/>, text: "LeetCode evidence unavailable" }, safeList(understood.weakAreas).length && { icon: <CircleHelp className="mt-1 h-4 w-4 shrink-0 text-amber-300"/>, text: `${safeList(understood.weakAreas).slice(0, 3).join(", ")} needs attention from your context` }].filter(Boolean); return <Section eyebrow="Current evidence" title="What Newbert understands" compact><div className="mt-5 space-y-3">{items.map((item) => <p key={item.text} className="flex gap-3 text-sm leading-6 text-slate-300">{item.icon}{item.text}</p>)}</div></Section>; }

function Explanation({ explanation, loading, error, onExplain }) { return <Section eyebrow="Why these priorities" title="Ask Newbert for a simple explanation" detail="Gemini explains the saved evidence and deterministic decisions. It cannot create requirements, reorder milestones, or change verified status."><button type="button" onClick={onExplain} disabled={loading} className="mt-5 inline-flex items-center gap-2 rounded-md bg-orange-400 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"><Sparkles className="h-4 w-4"/>{loading ? "Explaining" : explanation ? "Refresh explanation" : "Explain my roadmap"}</button>{error && <p className="mt-4 text-sm text-red-300">{error} Your saved strategy is still available.</p>}{explanation && <p className="mt-5 whitespace-pre-wrap rounded-lg bg-[#0b1425] p-5 text-sm leading-7 text-slate-300">{explanation}</p>}</Section>; }

function WeeklyPlan({ plan, milestones, open, onToggle }) {
  const hours = plan.target.weeklyHours;
  const active = milestones.filter((item) => !["completed", "skipped"].includes(item.status)).slice(0, 4);
  const allocation = hours && active.length ? active.map((item, index) => ({
    item,
    hours: Math.max(1, Math.floor(hours / active.length) + (index < hours % active.length ? 1 : 0)),
  })) : [];
  return <Section eyebrow="Optional planning" title="Turn milestones into a weekly allocation" compact><button type="button" onClick={onToggle} className="mt-5 inline-flex items-center gap-2 rounded-md bg-white/8 px-4 py-2.5 text-sm font-bold"><Clock3 className="h-4 w-4"/>{open ? "Hide weekly plan" : "Show weekly plan"}<ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}/></button>{open && <div className="mt-5">{!hours ? <p className="text-sm text-slate-400">Add available hours when changing your target. Newbert will not assume your schedule.</p> : allocation.length ? <div className="space-y-3">{allocation.map(({ item, hours: itemHours }) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg bg-[#0b1425] px-4 py-3 text-sm"><span className="font-semibold text-slate-200">{item.title}</span><span className="shrink-0 font-black text-orange-300">{itemHours} hrs</span></div>)}<p className="text-xs leading-5 text-slate-500">This is an effort split, not a daily schedule. Adjust it around classes and commitments.</p></div> : <p className="text-sm text-slate-400">No open milestone needs scheduling.</p>}</div>}</Section>;
}

function EvidenceDrawer({ value, onClose }) { const category = value.category; const current = value.current; const milestone = value.milestone; const evidence = safeList(category?.evidence || milestone?.evidence); return <Motion.div className="fixed inset-0 z-50 bg-black/65" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><Motion.aside role="dialog" aria-modal="true" aria-label="Roadmap evidence" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} onClick={(event) => event.stopPropagation()} className="absolute inset-y-0 right-0 w-full overflow-y-auto bg-[#101a2c] p-6 shadow-2xl sm:max-w-lg"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase text-orange-300">Why Newbert recommends this</p><h2 className="mt-2 text-2xl font-black">{category?.label || milestone?.title}</h2></div><button type="button" onClick={onClose} aria-label="Close evidence" className="grid h-9 w-9 place-items-center rounded-md bg-white/8"><X className="h-4 w-4"/></button></div>{category && <div className="mt-7 space-y-5"><DrawerFact label="Target signal" value={titleCase(category.importance)}/><DrawerFact label="Your position" value={positionLabel[current?.position] || "Unknown"}/><DrawerFact label="Evidence state" value={titleCase(current?.evidenceKind || "unknown")}/><p className="text-sm leading-6 text-slate-300">{category.reason}</p>{current?.limitation && <Notice tone="slate">{current.limitation}</Notice>}</div>}{milestone && <div className="mt-7 space-y-5"><DrawerFact label="Why" value={milestone.why}/><DrawerFact label="What remains" value={milestone.whatRemains}/><DrawerFact label="Done when" value={milestone.doneWhen}/></div>}<div className="mt-8"><p className="text-xs font-black uppercase text-slate-500">Evidence</p><div className="mt-3 space-y-3">{evidence.length ? evidence.map((item, index) => <article key={`${item.label}-${index}`} className="rounded-lg bg-[#0b1425] p-4"><p className="text-xs font-black text-orange-300">{item.level ? `Level ${item.level}` : "Recorded evidence"} · {titleCase(item.source)}</p><p className="mt-2 text-sm font-bold">{item.label}</p><p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-orange-300">Open source <ExternalLink className="h-3 w-3"/></a>}</article>) : <p className="text-sm leading-6 text-slate-400">No source-specific evidence is available. This recommendation currently comes from the labeled role baseline.</p>}</div></div></Motion.aside></Motion.div>; }

function Section({ eyebrow, title, detail, compact = false, children }) { return <section className={`rounded-lg bg-[#111c30] ${compact ? "p-6" : "p-6 md:p-8"}`}><p className="text-xs font-black uppercase text-orange-300">{eyebrow}</p><h2 className="mt-2 text-2xl font-black">{title}</h2>{detail && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{detail}</p>}{children}</section>; }
function Empty({ title, detail }) { return <div className="p-5"><p className="font-bold text-slate-200">{title}</p><p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p></div>; }
function Notice({ tone, children }) { const colors = tone === "emerald" ? "bg-emerald-400/10 text-emerald-100" : tone === "orange" ? "bg-orange-400/10 text-orange-100" : "bg-white/5 text-slate-300"; return <p className={`rounded-lg px-4 py-3 text-sm leading-6 ${colors}`}>{children}</p>; }
function Pill({ children }) { return <span className="rounded-md bg-white/8 px-2.5 py-1.5 text-xs font-bold text-slate-300">{children}</span>; }
function EvidenceCount({ label, value }) { return <div><p className="font-black text-slate-100">{value ?? 0}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>; }
function MatchFact({ label, active }) { return <p className="flex items-center gap-2 text-slate-300"><span className={`grid h-5 w-5 place-items-center rounded-sm ${active ? "bg-emerald-400 text-slate-950" : "bg-white/8 text-slate-500"}`}>{active ? <Check className="h-3 w-3"/> : "–"}</span>{label}</p>; }
function DrawerFact({ label, value }) { return <div><p className="text-[11px] font-black uppercase text-slate-500">{label}</p><p className="mt-1 text-sm leading-6 text-slate-200">{value}</p></div>; }
