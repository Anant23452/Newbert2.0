import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  ShieldCheck,
  Star,
  Target,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { addCourseToPlan } from "../Services/courseService";

export default function CourseFitDrawer({ item, onClose, onPlanAdded }) {
  const [adding, setAdding] = useState(false);
  const [planMessage, setPlanMessage] = useState("");

  if (!item) return null;
  const { course, match } = item;
  const breakdown = match.fitBreakdown || {};

  const handleAddToPlan = async () => {
    setAdding(true);
    setPlanMessage("");
    try {
      await addCourseToPlan(course._id);
      setPlanMessage("Course added to your roadmap plan.");
      if (onPlanAdded) onPlanAdded(course._id);
    } catch (err) {
      setPlanMessage(err.response?.data?.message || "Could not add to plan.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={onClose}
      >
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label={`Why ${course.title} fits your roadmap`}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          onMouseDown={(e) => e.stopPropagation()}
          className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-[#111c2e] p-6 text-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-orange-400">Course Fit Breakdown</p>
              <h2 className="mt-1 text-2xl font-black text-white">{course.title}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {course.provider} · {course.platform || "Official"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 text-slate-300 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          {/* Fit Score Banner */}
          <div className="mt-5 flex items-center justify-between rounded-xl border border-orange-400/30 bg-orange-400/10 p-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-300">
                Deterministic Fit Score
              </span>
              <p className="text-lg font-black text-white">{match.fitLabel || "Strong Match"}</p>
              <p className="mt-0.5 text-[11px] text-slate-300">Calculated from your verified gaps & target role</p>
            </div>
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-orange-500 text-2xl font-black text-slate-950 shadow-md">
              {match.score ?? match.fitScore}%
            </div>
          </div>

          {/* Key Reasons */}
          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Why this resource?</h3>
            <ul className="space-y-1.5 rounded-xl border border-white/5 bg-[#0d1727] p-4 text-xs leading-5 text-slate-300">
              {match.reasons?.map((reason) => (
                <li key={reason} className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span>{reason}</span>
                </li>
              ))}
              {!match.reasons?.length && (
                <li className="text-slate-400">Covers foundational and target role topics.</li>
              )}
            </ul>
          </div>

          {/* Gap Coverage Comparison */}
          <div className="mt-6">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Priority Gap Coverage</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3.5">
                <p className="text-[11px] font-black uppercase text-emerald-300">✓ Covered Gaps</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {match.missingSkills?.length ? (
                    match.missingSkills.map((gap) => (
                      <span key={gap} className="rounded bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                        {gap}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">General reinforcement</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#0d1727] p-3.5">
                <p className="text-[11px] font-black uppercase text-slate-400">○ Not Covered</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {match.fit?.uncoveredGaps?.length ? (
                    match.fit.uncoveredGaps.map((gap) => (
                      <span key={gap} className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-bold text-slate-400">
                        {gap}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No major remaining gaps</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fit Dimension Breakdown */}
          <div className="mt-6 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Fit Dimensions</h3>
            <div className="space-y-2.5 rounded-xl border border-white/5 bg-[#0d1727] p-4 text-xs">
              <FitBar label="Gap Coverage" weight="45%" score={breakdown.gapCoverage ?? 75} />
              <FitBar label="Target Role Relevance" weight="25%" score={breakdown.targetRelevance ?? 80} />
              <FitBar label="Level Fit" weight="15%" score={breakdown.levelFit ?? 85} />
              <FitBar label="Course Quality" weight="10%" score={breakdown.courseQuality ?? 85} />
              <FitBar label="Preference / Value" weight="5%" score={breakdown.preferenceValue ?? 90} />
            </div>
          </div>

          {/* Course Details */}
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-[#0d1727] p-2.5">
              <p className="text-[10px] font-bold uppercase text-slate-400">Level</p>
              <p className="mt-0.5 text-xs font-extrabold capitalize text-white">{course.level}</p>
            </div>
            <div className="rounded-lg bg-[#0d1727] p-2.5">
              <p className="text-[10px] font-bold uppercase text-slate-400">Duration</p>
              <p className="mt-0.5 text-xs font-extrabold text-white">
                {course.estimatedHours ? `${course.estimatedHours} hrs` : "Self-paced"}
              </p>
            </div>
            <div className="rounded-lg bg-[#0d1727] p-2.5">
              <p className="text-[10px] font-bold uppercase text-slate-400">Price</p>
              <p className="mt-0.5 text-xs font-extrabold capitalize text-white">
                {course.price || course.priceType}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-3 border-t border-white/10 pt-5">
            {planMessage && (
              <p className="text-xs font-bold text-emerald-300">{planMessage}</p>
            )}
            <div className="flex gap-3">
              <a
                href={course.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-xs font-black text-slate-950 shadow-md transition hover:bg-orange-400"
              >
                Open Course <ExternalLink size={14} />
              </a>
              <button
                type="button"
                onClick={handleAddToPlan}
                disabled={adding}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                <Plus size={14} /> {adding ? "Adding..." : "Add to Plan"}
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400">
              Neutral course recommendation. Affiliate status never alters fit rankings.
            </p>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}

function FitBar({ label, weight, score }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold">
        <span className="text-slate-300">{label} <span className="text-[10px] text-slate-400">({weight})</span></span>
        <span className="text-orange-300">{score}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div style={{ width: `${score}%` }} className="h-full rounded-full bg-orange-400" />
      </div>
    </div>
  );
}
