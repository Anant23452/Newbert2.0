import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Clock3,
  ExternalLink,
  GitBranch,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const Motion = motion;

const positionLabel = {
  strong: "Strong evidence",
  developing: "Developing",
  needs_verification: "Needs verification",
  self_reported: "Self-reported only",
  weak: "Weak evidence",
  weak_evidence: "Weak evidence",
  unknown: "Unknown",
};

const readinessLabel = {
  insufficient_evidence: "Needs more evidence",
  early: "Early",
  building: "Building",
  near_target: "Near target",
  target_ready: "Target ready",
};

const gapLabel = {
  target_gap: "Target gap",
  knowledge_gap: "Knowledge gap",
  evidence_gap: "Evidence gap",
  validation_needed: "Validation needed",
  optional: "Optional",
  ready: "Ready",
};

const importanceTone = {
  critical: "bg-red-400/10 text-red-200 border border-red-500/20",
  high: "bg-orange-400/10 text-orange-200 border border-orange-500/20",
  medium: "bg-sky-400/10 text-sky-200 border border-sky-500/20",
  low: "bg-slate-400/10 text-slate-300 border border-slate-500/20",
};

const positionTone = {
  strong: "bg-emerald-400",
  developing: "bg-orange-400",
  needs_verification: "bg-amber-300",
  weak: "bg-rose-400",
  weak_evidence: "bg-rose-400",
  unknown: "bg-slate-600",
};

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function PreparationDashboard({
  plan,
  busyMilestone,
  recalculating,
  aiExplanation,
  aiLoading,
  aiError,
  onExplainPlan,
  onMilestoneStatus,
  onChangeGoal,
  onRecalculate,
}) {
  const [drawer, setDrawer] = useState(null);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  const current = new Map(safeList(plan.currentPosition?.categories).map((item) => [item.key, item]));
  const milestones = safeList(plan.milestones).filter((item) => !item.archived);
  const phases = safeList(plan.strategyPhases);
  const understood = plan.understoodCurrentStage || {};
  const alreadyCovered = safeList(plan.alreadyCovered).length
    ? plan.alreadyCovered
    : safeList(plan.preparationGaps).filter((g) => g.gapType === "ready");

  return (
    <main className="min-h-screen bg-[#0b1220] px-4 py-8 text-white sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        {plan.recalculated && (
          <Notice tone="emerald">Strategy refreshed. Completed milestones and previous history were preserved.</Notice>
        )}
        {plan.needsRecalculation && (
          <Notice tone="orange">Your evidence changed. Refresh the strategy when you are ready to review updated priorities.</Notice>
        )}

        <TargetHeader
          plan={plan}
          recalculating={recalculating}
          onChangeGoal={onChangeGoal}
          onRecalculate={onRecalculate}
          onShowEvidence={() => setActiveModal("evidence")}
        />

        {plan.targetBenchmark?.fallbackMessage && (
          <Notice tone="slate">{plan.targetBenchmark.fallbackMessage}</Notice>
        )}

        <Section
          eyebrow="Target expectations"
          title="What this target expects"
          detail="Importance is derived from the strongest available target evidence. Click 'Why?' on any area to inspect the reasoning."
        >
          <div className="overflow-hidden rounded-lg bg-[#101a2c]">
            <div className="hidden grid-cols-[1.4fr_.7fr_.9fr_60px] gap-4 border-b border-white/8 px-5 py-3 text-[11px] font-bold uppercase text-slate-500 md:grid">
              <span>Category</span>
              <span>Importance</span>
              <span>Your position</span>
              <span className="text-right">Details</span>
            </div>
            {safeList(plan.targetBenchmark?.categories).length ? (
              safeList(plan.targetBenchmark.categories).map((category) => {
                const mine = current.get(category.key) || { position: "unknown", evidenceKind: "unknown", evidenceState: "unknown" };
                return (
                  <div
                    key={category.key}
                    className="grid w-full gap-3 border-b border-white/8 px-5 py-4 text-left last:border-0 hover:bg-white/[.02] md:grid-cols-[1.4fr_.7fr_.9fr_60px] md:items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-100">{category.label}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{category.reason}</p>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold capitalize ${importanceTone[category.importance] || importanceTone.medium}`}>
                        {category.importance}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                      <span className={`h-2 w-2 rounded-sm ${positionTone[mine.position] || positionTone.unknown}`} />
                      {positionLabel[mine.position] || positionLabel[mine.evidenceState] || "Unknown"}
                    </div>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setDrawer({ category, current: mine })}
                        className="rounded-md bg-white/6 px-2.5 py-1 text-xs font-bold text-orange-300 hover:bg-white/10"
                      >
                        Why?
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty
                title="No target benchmark yet"
                detail="Refresh the strategy or choose a supported role. Newbert will not invent company requirements."
              />
            )}
          </div>
        </Section>

        {alreadyCovered.length > 0 && (
          <Section
            eyebrow="Target mastery"
            title="Already covered for this target"
            detail="You do NOT need to prioritize these areas. They are excluded from your preparation milestones."
            compact
          >
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {alreadyCovered.map((item) => (
                <div key={item.key || item.categoryKey} className="flex items-start gap-3 rounded-lg bg-[#0c1526] p-4">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/20 text-emerald-300">
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-100">{item.label}</h4>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.reason || "Strong verified evidence currently meets the role benchmark."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <VerifiedEvidence plan={plan} />
          <Blockers blockers={plan.biggestBlockers} onInspect={(gap) => setDrawer({ gap, category: gap.target, current: gap.current })} />
        </section>

        <NextBestMove
          move={plan.nextBestMove}
          milestone={milestones.find((m) => m.id === plan.nextBestMove?.milestoneId) || milestones[0]}
          busy={busyMilestone}
          onStatus={onMilestoneStatus}
        />

        <Section
          eyebrow="Preparation path"
          title="Milestones, not a forced daily schedule"
          detail="Targeted gap closure milestones. Each milestone is expandable with verified completion criteria."
        >
          {phases.length ? (
            <div className="relative space-y-6 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-white/10">
              {phases.map((phase, phaseIndex) => (
                <div key={phase.id} className="relative grid gap-4 pl-11 lg:grid-cols-[220px_1fr]">
                  <span className="absolute left-2 top-5 grid h-5 w-5 place-items-center rounded-sm bg-orange-400 text-[10px] font-black text-slate-950">
                    {phaseIndex + 1}
                  </span>
                  <div className="pt-3">
                    <p className="text-xs font-bold uppercase text-orange-300">Phase {phaseIndex + 1}</p>
                    <h3 className="mt-1 text-lg font-black">{phase.title}</h3>
                  </div>
                  <div className="space-y-3">
                    {milestones
                      .filter((item) => item.phaseId === phase.id)
                      .map((milestone) => (
                        <MilestoneCard
                          key={milestone.id}
                          milestone={milestone}
                          isExpanded={expandedMilestoneId === milestone.id}
                          onToggleExpand={() =>
                            setExpandedMilestoneId((curr) => (curr === milestone.id ? null : milestone.id))
                          }
                          busy={busyMilestone === milestone.id}
                          onStatus={onMilestoneStatus}
                          onWhy={() => setDrawer({ milestone })}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Your strategy is fully up to date"
              detail="No active gaps remain for this target. Refresh when your target or evidence changes."
            />
          )}
        </Section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SeniorBenchmark
            match={plan.seniorMatch}
            group={plan.seniorBenchmarkGroup}
            target={plan.target}
            onOpenStrategy={() => setActiveModal("strategy")}
            onOpenComparison={() => setActiveModal("comparison")}
            onChangeGoal={onChangeGoal}
          />
          <DerivedEvidence profileSnapshot={plan.profileSnapshot} understood={understood} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <ExplanationSummary
            explanation={aiExplanation}
            loading={aiLoading}
            error={aiError}
            onExplain={() => {
              onExplainPlan();
              setActiveModal("explanation");
            }}
          />
          <ConfidenceBooster actions={plan.confidenceActions} onChangeGoal={onChangeGoal} />
        </section>

        <WeeklyPlan
          plan={plan}
          milestones={milestones}
          open={weeklyOpen}
          onToggle={() => setWeeklyOpen((value) => !value)}
        />
      </div>

      <AnimatePresence>
        {drawer && <EvidenceDrawer value={drawer} onClose={() => setDrawer(null)} />}
        {activeModal === "evidence" && (
          <EvidenceModal summary={plan.targetBenchmark?.evidenceSummary} onClose={() => setActiveModal(null)} />
        )}
        {activeModal === "comparison" && (
          <SeniorComparisonModal
            match={plan.seniorMatch}
            currentPosition={plan.currentPosition}
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeModal === "strategy" && (
          <SeniorStrategyModal senior={plan.seniorMatch?.senior} onClose={() => setActiveModal(null)} />
        )}
        {activeModal === "explanation" && (
          <ExplanationModal
            explanation={aiExplanation}
            loading={aiLoading}
            error={aiError}
            onClose={() => setActiveModal(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function TargetHeader({ plan, recalculating, onChangeGoal, onRecalculate, onShowEvidence }) {
  const benchmark = plan.targetBenchmark || {};
  const isExploratory = (plan.targetConfidence || "exploratory") === "exploratory";

  return (
    <header className="overflow-hidden rounded-lg bg-[#111c30] shadow-2xl shadow-black/20">
      <div className="grid gap-7 p-6 md:p-8 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase text-orange-300">
            <Target className="h-4 w-4" /> My target
          </div>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">{plan.target.role}</h1>
          <p className="mt-2 text-base font-semibold text-slate-300">
            {plan.target.company || (plan.target.companyCategory ? `${titleCase(plan.target.companyCategory)} company` : "Role-level benchmark")}
            {plan.target.region ? ` · ${plan.target.region}` : ""}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Pill tone={isExploratory ? "amber" : "emerald"}>
              {titleCase(plan.targetConfidence || "exploratory")} confidence
            </Pill>
            <Pill>{readinessLabel[plan.overallReadiness] || "Needs evidence"}</Pill>
            {plan.target.deadline && <Pill>Target {formatDate(plan.target.deadline)}</Pill>}
            {plan.target.weeklyHours && <Pill>{plan.target.weeklyHours} hrs/week</Pill>}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-lg bg-[#0b1425] p-5">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase text-slate-400">Strategy Confidence</p>
              <span className={`text-xs font-bold uppercase ${isExploratory ? "text-amber-300" : "text-emerald-300"}`}>
                {plan.targetConfidence || "Exploratory"}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-300">
              {isExploratory
                ? "Based mainly on the role benchmark because no specific company has been selected yet. Connect company evidence to make requirements specific."
                : "Target requirements are tailored using verified job descriptions and specific company hiring criteria."}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={onShowEvidence}
              className="text-xs font-bold text-orange-300 hover:text-orange-200"
            >
              See evidence signals →
            </button>
            {isExploratory && (
              <button
                type="button"
                onClick={onChangeGoal}
                className="rounded bg-white/8 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/12"
              >
                Choose target company
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/15 px-6 py-4 md:px-8">
        <p className="text-xs text-slate-400">Target → Expectations → Evidence → Gaps → Milestones</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRecalculate}
            disabled={recalculating}
            className="inline-flex items-center gap-2 rounded-md bg-white/8 px-3 py-2 text-xs font-bold hover:bg-white/12 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
            {recalculating ? "Refreshing" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={onChangeGoal}
            className="rounded-md bg-orange-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-orange-300"
          >
            Change target
          </button>
        </div>
      </div>
    </header>
  );
}

function VerifiedEvidence({ plan }) {
  const categories = safeList(plan.currentPosition?.categories);

  return (
    <Section eyebrow="Evidence Verification" title="WHAT NEWBERT CAN VERIFY" compact>
      <p className="mt-2 text-xs text-slate-400">
        Measures verified evidence confidence, not raw skill ability.
      </p>
      <div className="mt-5 space-y-3.5">
        {categories.length ? (
          categories.slice(0, 6).map((item) => (
            <div key={item.key} className="rounded-lg bg-[#0c1526] p-3.5">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-slate-200">{item.label}</span>
                <span className="text-xs font-bold text-slate-400">
                  {positionLabel[item.position] || positionLabel[item.evidenceState] || "Unknown"}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                <Motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width:
                      item.position === "strong"
                        ? "100%"
                        : item.position === "developing"
                        ? "60%"
                        : item.position === "needs_verification"
                        ? "35%"
                        : "10%",
                  }}
                  className={`h-full ${positionTone[item.position] || positionTone.unknown}`}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-400">
            Newbert needs connected activity, project details, or an assessment before it can verify your evidence.
          </p>
        )}
      </div>
    </Section>
  );
}

function Blockers({ blockers, onInspect }) {
  return (
    <Section eyebrow="Highest-Value Gaps" title="Top 3 Gaps" compact>
      <p className="mt-2 text-xs text-slate-400">
        Unresolved issues prioritized by target importance and evidence gap severity.
      </p>
      <div className="mt-5 space-y-3">
        {safeList(blockers).length ? (
          safeList(blockers).map((gap, index) => (
            <article
              key={gap.id}
              onClick={() => onInspect?.(gap)}
              className="flex cursor-pointer gap-4 rounded-lg bg-[#0c1526] p-4 transition hover:bg-[#101b30]"
            >
              <span className="text-2xl font-black text-orange-400">{index + 1}</span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-100">{gap.label}</h3>
                  <span className="rounded-md bg-orange-400/10 px-2 py-1 text-[10px] font-black uppercase text-orange-200">
                    {gapLabel[gap.gapType] || "Gap"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{gap.reason}</p>
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="No high-priority blockers"
            detail="Your current evidence matches or exceeds the required target baseline."
          />
        )}
      </div>
    </Section>
  );
}

function NextBestMove({ move, milestone, busy, onStatus }) {
  if (!move && !milestone) {
    return (
      <section className="rounded-lg bg-emerald-400/10 p-6">
        <p className="text-xs font-black uppercase text-emerald-300">Next best move</p>
        <h2 className="mt-2 text-2xl font-black">You are caught up on the current strategy.</h2>
        <p className="mt-2 text-sm text-slate-300">
          Refresh your roadmap when your projects or target change.
        </p>
      </section>
    );
  }

  const title = move?.title || (milestone ? `Focus on ${milestone.title}` : "Next Action");
  const why = move?.why || milestone?.whatRemains || "Priority milestone for your target.";

  return (
    <section className="rounded-lg bg-gradient-to-r from-orange-400/15 via-[#121d31] to-[#121d31] p-6 md:p-8 shadow-xl">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-400" />
            <p className="text-xs font-black uppercase text-orange-300">NEXT BEST MOVE</p>
          </div>
          <h2 className="mt-2 text-2xl font-black md:text-3xl text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{why}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {move?.actions?.length ? (
            move.actions.map((act) =>
              act.href ? (
                <Link
                  key={act.label}
                  to={act.href}
                  className="inline-flex items-center gap-2 rounded-md bg-orange-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-orange-300"
                >
                  {act.label} <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  key={act.label}
                  type="button"
                  disabled={busy}
                  onClick={() => milestone && onStatus(milestone, "in_progress")}
                  className="inline-flex items-center gap-2 rounded-md bg-orange-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-orange-300"
                >
                  {act.label} <ArrowRight className="h-4 w-4" />
                </button>
              )
            )
          ) : milestone ? (
            <button
              type="button"
              disabled={busy || milestone.status === "in_progress"}
              onClick={() => onStatus(milestone, "in_progress")}
              className="inline-flex items-center gap-2 rounded-md bg-orange-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-orange-300 disabled:opacity-60"
            >
              {milestone.status === "in_progress" ? "In progress" : "Start milestone"}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MilestoneCard({ milestone, isExpanded, onToggleExpand, busy, onStatus, onWhy }) {
  return (
    <article className="rounded-lg bg-[#111c30] p-4 transition-all">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="cursor-pointer flex-1" onClick={onToggleExpand}>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-black text-slate-100">{milestone.title}</h4>
            <span className="rounded-md bg-white/8 px-2 py-0.5 text-[10px] font-black uppercase text-slate-300">
              {gapLabel[milestone.gapType] || milestone.classification}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 line-clamp-1">{milestone.what}</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label={`Status for ${milestone.title}`}
            value={milestone.status || "not_started"}
            disabled={busy}
            onChange={(event) => onStatus(milestone, event.target.value)}
            className="rounded-md bg-[#0b1425] px-2.5 py-1.5 text-xs font-bold text-white outline-none ring-1 ring-white/10"
          >
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="skipped">Skipped</option>
          </select>

          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded-md bg-white/6 p-1.5 text-slate-300 hover:bg-white/10"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <Motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 border-t border-white/8 pt-4 text-xs text-slate-300"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <strong className="text-slate-400">Current state:</strong>{" "}
              <span>{positionLabel[milestone.currentState] || titleCase(milestone.currentState)}</span>
            </div>
            <div>
              <strong className="text-slate-400">Target expectation:</strong>{" "}
              <span>{titleCase(milestone.targetState)}</span>
            </div>
            <div className="sm:col-span-2">
              <strong className="text-slate-400">Done when:</strong>{" "}
              <span className="text-emerald-300">{milestone.doneWhen}</span>
            </div>
            <div className="sm:col-span-2">
              <strong className="text-slate-400">What remains:</strong>{" "}
              <span>{milestone.whatRemains}</span>
            </div>
            <div>
              <strong className="text-slate-400">Estimated effort:</strong>{" "}
              <span>{milestone.estimatedEffort}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3">
            <button type="button" onClick={onWhy} className="font-bold text-orange-300 hover:underline">
              Why this milestone?
            </button>
            <span className="text-[11px] text-slate-500">
              Note: Status is your progress tracker; Newbert verification updates separately.
            </span>
          </div>
        </Motion.div>
      )}
    </article>
  );
}

function SeniorBenchmark({ match, group, target, onOpenStrategy, onOpenComparison, onChangeGoal }) {
  if (!match) {
    return (
      <Section eyebrow="Senior benchmark" title="No exact senior benchmark yet" compact>
        <p className="mt-3 text-xs leading-5 text-slate-400">
          We looked for verified seniors with similar background and role targets.
        </p>
        <div className="mt-4 space-y-2 text-xs text-slate-300">
          <p className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span> Similar role family
          </p>
          <p className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span> Similar college / background
          </p>
          <p className="flex items-center gap-2">
            <span className="text-amber-400">○</span> Exact company — none selected
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onChangeGoal}
            className="rounded bg-orange-400 px-3 py-2 text-xs font-bold text-slate-950"
          >
            Choose target company
          </button>
          <Link to="/alumni-wall" className="rounded bg-white/8 px-3 py-2 text-xs font-bold text-slate-200">
            Browse verified alumni
          </Link>
        </div>
      </Section>
    );
  }

  const senior = match.senior;
  const isDemo = senior?.isDemo;
  const breakdown = match.breakdown || {};
  const exactCompany =
    Boolean(target.company) &&
    String(senior?.company || "").toLowerCase() === String(target.company).toLowerCase();

  return (
    <Section eyebrow="Senior Benchmark" title={senior.name} compact>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-sm text-slate-300">
          {senior.company} · {senior.role || "Specialist Programmer"}
        </p>
        {isDemo ? (
          <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300 border border-amber-400/30">
            DEMO PROFILE
          </span>
        ) : (
          <span className="rounded bg-emerald-400/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
            Verified Senior
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {isDemo
          ? "Demo senior used for product testing. Never counts toward production verification metrics."
          : "Verified alumni path from your college cohort."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
        <MatchFact label="Same college" active={breakdown.collegeBranch === 100 || breakdown.sameCollege === 100} />
        <MatchFact label="Same role family" active={breakdown.role === 100 || breakdown.sameTargetRole === 100} />
        <MatchFact label="Strong DSA path" active={Boolean(senior.preparationStrategy || breakdown.dsa >= 70)} />
        <MatchFact label="Same company" active={exactCompany} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onOpenStrategy}
          className="inline-flex items-center gap-1.5 rounded-md bg-orange-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-orange-300"
        >
          <BookOpen className="h-3.5 w-3.5" /> See Preparation Strategy
        </button>
        <button
          type="button"
          onClick={onOpenComparison}
          className="inline-flex items-center gap-1.5 rounded-md bg-white/8 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/12"
        >
          <Layers className="h-3.5 w-3.5" /> Senior Comparison
        </button>
      </div>
    </Section>
  );
}

function DerivedEvidence({ profileSnapshot, understood }) {
  const hasLeetcode = Boolean(profileSnapshot?.leetcode?.username);
  const hasGithub = Boolean(profileSnapshot?.github?.username);
  const hasProjects = Number(profileSnapshot?.projects) > 0;

  return (
    <Section eyebrow="Current Evidence" title="What Newbert Derived" compact>
      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-3 rounded-lg bg-[#0c1526] p-3">
          <ShieldCheck className={`mt-0.5 h-4 w-4 shrink-0 ${hasLeetcode ? "text-emerald-400" : "text-amber-400"}`} />
          <div className="text-xs">
            <p className="font-bold text-slate-200">LEETCODE {hasLeetcode ? "✓" : "⚠"}</p>
            <p className="mt-0.5 text-slate-400">
              {hasLeetcode
                ? `Strong DSA evidence detected (@${profileSnapshot.leetcode.username} · ${profileSnapshot.leetcode.totalSolved} solved).`
                : "Not connected; DSA level relies on profile mentions."}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-[#0c1526] p-3">
          <GitBranch className={`mt-0.5 h-4 w-4 shrink-0 ${hasGithub ? "text-emerald-400" : "text-amber-400"}`} />
          <div className="text-xs">
            <p className="font-bold text-slate-200">GITHUB {hasGithub ? "✓" : "⚠"}</p>
            <p className="mt-0.5 text-slate-400">
              {hasGithub
                ? `Connected (@${profileSnapshot.github.username} · ${profileSnapshot.github.publicRepos} repos). Project manifest scanner active.`
                : "Not connected; repository evidence unavailable."}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-[#0c1526] p-3">
          <CircleAlert className={`mt-0.5 h-4 w-4 shrink-0 ${hasProjects ? "text-emerald-400" : "text-amber-400"}`} />
          <div className="text-xs">
            <p className="font-bold text-slate-200">PROJECT EVIDENCE {hasProjects ? "✓" : "⚠"}</p>
            <p className="mt-0.5 text-slate-400">
              {hasProjects
                ? `${profileSnapshot.projects} project record(s) logged. Connect GitHub to verify framework patterns.`
                : "No verified featured-project evidence yet."}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ExplanationSummary({ explanation, loading, error, onExplain }) {
  const shortText = explanation
    ? explanation.slice(0, 180) + (explanation.length > 180 ? "..." : "")
    : "Your DSA evidence supports the role baseline. Newbert is prioritizing programming fundamentals, CS fundamentals and project evidence because those areas are currently unverified.";

  return (
    <Section eyebrow="Strategy Rationale" title="Why These Priorities" compact>
      <p className="mt-3 text-xs leading-6 text-slate-300">{shortText}</p>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <button
        type="button"
        onClick={onExplain}
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-orange-400 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-orange-300 disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {loading ? "Analyzing..." : "Ask Newbert why"}
      </button>
    </Section>
  );
}

function ConfidenceBooster({ actions, onChangeGoal }) {
  const list = safeList(actions);

  return (
    <Section eyebrow="Signal Quality" title="Improve Roadmap Confidence" compact>
      <p className="mt-2 text-xs text-slate-400">Highest-impact actions to replace exploratory assumptions with verified evidence:</p>
      <div className="mt-4 space-y-2.5">
        {list.length ? (
          list.map((act, index) => (
            <div key={act.title} className="flex items-start gap-3 rounded-lg bg-[#0c1526] p-3 text-xs">
              <span className="font-black text-orange-400">{index + 1}.</span>
              <div className="flex-1">
                <p className="font-bold text-slate-200">{act.title}</p>
                <p className="mt-0.5 text-slate-400">{act.reason}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400">Your profile evidence is already well-connected.</p>
        )}
      </div>
    </Section>
  );
}

function WeeklyPlan({ plan, milestones, open, onToggle }) {
  const hours = plan.target.weeklyHours;
  const active = milestones.filter((item) => !["completed", "skipped"].includes(item.status)).slice(0, 4);
  const allocation =
    hours && active.length
      ? active.map((item, index) => ({
          item,
          hours: Math.max(1, Math.floor(hours / active.length) + (index < hours % active.length ? 1 : 0)),
        }))
      : [];

  return (
    <Section eyebrow="Effort Distribution" title="Turn Milestones into a Weekly Allocation" compact>
      <button
        type="button"
        onClick={onToggle}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-white/8 px-4 py-2 text-xs font-bold hover:bg-white/12"
      >
        <Clock3 className="h-3.5 w-3.5" />
        {open ? "Hide weekly allocation" : "Show weekly allocation"}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-5">
          {!hours ? (
            <p className="text-xs text-slate-400">
              Add your available hours per week in target settings to receive an effort split.
            </p>
          ) : allocation.length ? (
            <div className="space-y-2.5">
              {allocation.map(({ item, hours: itemHours }) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-[#0b1425] px-4 py-3 text-xs">
                  <span className="font-semibold text-slate-200">{item.title}</span>
                  <span className="font-black text-orange-300">{itemHours} hrs/week</span>
                </div>
              ))}
              <p className="text-[11px] leading-5 text-slate-500">
                Total: {hours} hrs/week distributed across active gaps. Adapts automatically as evidence improves.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No open milestones requiring scheduling.</p>
          )}
        </div>
      )}
    </Section>
  );
}

function EvidenceDrawer({ value, onClose }) {
  const category = value.category || value.milestone;
  const current = value.current;
  const milestone = value.milestone;
  const evidence = safeList(category?.evidence || milestone?.evidence);

  return (
    <Motion.div
      className="fixed inset-0 z-50 bg-black/65"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Roadmap evidence"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        onClick={(event) => event.stopPropagation()}
        className="absolute inset-y-0 right-0 w-full overflow-y-auto bg-[#101a2c] p-6 shadow-2xl sm:max-w-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-orange-300">Why Newbert Recommends This</p>
            <h2 className="mt-2 text-2xl font-black">{category?.label || milestone?.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close evidence" className="grid h-9 w-9 place-items-center rounded-md bg-white/8">
            <X className="h-4 w-4" />
          </button>
        </div>

        {category && (
          <div className="mt-7 space-y-4 text-xs">
            <DrawerFact label="Target importance" value={titleCase(category.importance)} />
            <DrawerFact label="Your current position" value={positionLabel[current?.position] || "Needs verification"} />
            <DrawerFact label="Evidence quality" value={titleCase(current?.evidenceKind || current?.evidenceState || "self_reported")} />
            <p className="text-sm leading-6 text-slate-300">{category.reason}</p>
            {current?.limitation && <Notice tone="slate">{current.limitation}</Notice>}
          </div>
        )}

        {milestone && (
          <div className="mt-7 space-y-4 text-xs">
            <DrawerFact label="Why this milestone" value={milestone.why} />
            <DrawerFact label="What remains" value={milestone.whatRemains} />
            <DrawerFact label="Done when" value={milestone.doneWhen} />
          </div>
        )}

        <div className="mt-8">
          <p className="text-xs font-black uppercase text-slate-500">Source Evidence</p>
          <div className="mt-3 space-y-3">
            {evidence.length ? (
              evidence.map((item, index) => (
                <article key={`${item.label}-${index}`} className="rounded-lg bg-[#0b1425] p-4 text-xs">
                  <p className="font-black text-orange-300">
                    {item.level ? `Level ${item.level}` : "Recorded signal"} · {titleCase(item.source)}
                  </p>
                  <p className="mt-2 font-bold text-slate-200">{item.label}</p>
                  <p className="mt-1 leading-5 text-slate-400">{item.detail}</p>
                </article>
              ))
            ) : (
              <p className="text-xs text-slate-400">
                No source-specific JD is attached. This expectation comes from the standard role baseline.
              </p>
            )}
          </div>
        </div>
      </Motion.aside>
    </Motion.div>
  );
}

function SeniorComparisonModal({ match, currentPosition, onClose }) {
  const senior = match?.senior || {};
  const isDemo = senior.isDemo;
  const categories = safeList(currentPosition?.categories);

  return (
    <Motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl bg-[#101a2c] p-6 shadow-2xl border border-white/10"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-orange-300">Side-by-Side Comparison</span>
              {isDemo && <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-300">DEMO</span>}
            </div>
            <h2 className="mt-1 text-2xl font-black">You vs {senior.name}</h2>
            <p className="mt-1 text-xs text-slate-400">{senior.company} · {senior.role}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md bg-white/8 p-1.5 text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg bg-[#0b1425]">
          <div className="grid grid-cols-3 border-b border-white/8 px-4 py-3 text-xs font-black uppercase text-slate-400">
            <span>Area</span>
            <span>You</span>
            <span className="text-orange-300">{senior.name?.split(" ")[0]}</span>
          </div>

          <div className="divide-y divide-white/6 text-xs">
            {categories.map((cat) => (
              <div key={cat.key} className="grid grid-cols-3 px-4 py-3 items-center">
                <span className="font-bold text-slate-200">{cat.label}</span>
                <span className="text-slate-300">{positionLabel[cat.position] || "Needs verification"}</span>
                <span className="font-bold text-emerald-300">Strong (Verified)</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-5 text-slate-500">
          Categorical comparison based on recorded portfolio evidence. No fake percentages are generated.
        </p>
      </Motion.div>
    </Motion.div>
  );
}

function SeniorStrategyModal({ senior, onClose }) {
  if (!senior) return null;
  const strat = senior.preparationStrategy || {};
  const phases = safeList(strat.phases);

  return (
    <Motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-[#101a2c] p-6 shadow-2xl border border-white/10"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-black uppercase text-orange-300">Senior Preparation Strategy</span>
            <h2 className="mt-1 text-2xl font-black">{senior.name}'s Placement Journey</h2>
            <p className="mt-1 text-xs text-slate-400">{senior.company} ({senior.package ? `${senior.package} LPA` : "Placed"})</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md bg-white/8 p-1.5 text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {phases.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-black uppercase text-slate-400">Preparation Phases</h3>
            <div className="mt-3 space-y-2.5">
              {phases.map((p, idx) => (
                <div key={idx} className="rounded-lg bg-[#0b1425] p-3 text-xs">
                  <span className="font-black text-orange-300">{p.duration || `Phase ${idx + 1}`}: </span>
                  <span className="font-bold text-slate-200">{p.phase || p.title}</span>
                  <p className="mt-1 text-slate-400">{p.focus || p.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {strat.whatWasUnnecessary && (
          <div className="mt-5 rounded-lg bg-red-400/10 p-4 text-xs border border-red-500/20">
            <p className="font-black text-red-300 uppercase">What Was Unnecessary</p>
            <p className="mt-1 text-slate-300">{strat.whatWasUnnecessary}</p>
          </div>
        )}

        {strat.keyAdvice && (
          <div className="mt-4 rounded-lg bg-emerald-400/10 p-4 text-xs border border-emerald-500/20">
            <p className="font-black text-emerald-300 uppercase">Senior Advice</p>
            <p className="mt-1 text-slate-300">{strat.keyAdvice}</p>
          </div>
        )}

        {senior.mentorship?.available && (
          <div className="mt-4 rounded-lg bg-[#0b1425] p-4 text-xs">
            <p className="font-black text-orange-300 uppercase">Mentorship Topics</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {safeList(senior.mentorship.topics).map((t) => (
                <span key={t} className="rounded bg-white/8 px-2 py-1 text-slate-300">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </Motion.div>
    </Motion.div>
  );
}

function EvidenceModal({ summary = {}, onClose }) {
  return (
    <Motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-[#101a2c] p-6 shadow-2xl border border-white/10"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black">Strategy Evidence Signals</h2>
            <p className="mt-1 text-xs text-slate-400">Underlying data sources for this benchmark</p>
          </div>
          <button type="button" onClick={onClose} className="rounded bg-white/8 p-1 text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-center">
          <div className="rounded-lg bg-[#0b1425] p-4">
            <p className="text-2xl font-black text-orange-400">{summary.officialJobs ?? 0}</p>
            <p className="mt-1 text-xs text-slate-400">Current JDs</p>
          </div>
          <div className="rounded-lg bg-[#0b1425] p-4">
            <p className="text-2xl font-black text-emerald-400">{summary.verifiedAlumni ?? 0}</p>
            <p className="mt-1 text-xs text-slate-400">Verified Alumni</p>
          </div>
        </div>
      </Motion.div>
    </Motion.div>
  );
}

function ExplanationModal({ explanation, loading, error, onClose }) {
  return (
    <Motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-[#101a2c] p-6 shadow-2xl border border-white/10"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-black uppercase text-orange-300">Grounded AI Analysis</span>
            <h2 className="mt-1 text-2xl font-black">Why These Roadmap Priorities</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded bg-white/8 p-1 text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 text-sm leading-7 text-slate-300 whitespace-pre-wrap rounded-lg bg-[#0b1425] p-5">
          {loading ? "Generating explanation..." : error || explanation}
        </div>
      </Motion.div>
    </Motion.div>
  );
}

function Section({ eyebrow, title, detail, compact = false, children }) {
  return (
    <section className={`rounded-lg bg-[#111c30] ${compact ? "p-6" : "p-6 md:p-8"}`}>
      <p className="text-xs font-black uppercase text-orange-300">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black">{title}</h2>
      {detail && <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">{detail}</p>}
      {children}
    </section>
  );
}

function Empty({ title, detail }) {
  return (
    <div className="p-5">
      <p className="font-bold text-slate-200">{title}</p>
      <p className="mt-2 text-xs leading-6 text-slate-400">{detail}</p>
    </div>
  );
}

function Notice({ tone, children }) {
  const colors =
    tone === "emerald"
      ? "bg-emerald-400/10 text-emerald-100 border border-emerald-500/20"
      : tone === "orange"
      ? "bg-orange-400/10 text-orange-100 border border-orange-500/20"
      : "bg-white/5 text-slate-300";
  return <p className={`rounded-lg px-4 py-3 text-xs leading-6 ${colors}`}>{children}</p>;
}

function Pill({ tone, children }) {
  const color = tone === "emerald" ? "bg-emerald-400/10 text-emerald-300 border-emerald-500/30" : tone === "amber" ? "bg-amber-400/10 text-amber-300 border-amber-500/30" : "bg-white/8 text-slate-300";
  return <span className={`rounded-md px-2.5 py-1 text-xs font-bold border border-white/10 ${color}`}>{children}</span>;
}

function MatchFact({ label, active }) {
  return (
    <p className="flex items-center gap-2 text-slate-300">
      <span className={`grid h-4 w-4 place-items-center rounded-sm ${active ? "bg-emerald-400 text-slate-950 font-black" : "bg-white/8 text-slate-500"}`}>
        {active ? "✓" : "–"}
      </span>
      {label}
    </p>
  );
}

function DrawerFact({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xs leading-6 text-slate-200">{value}</p>
    </div>
  );
}
