import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  CircleHelp,
  Code2,
  ExternalLink,
  FolderGit2,
  Github,
  Layers,
  Plus,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import API from "../Services/api";
import { confirmProjectTechnologies } from "../Services/projectService";

const CATEGORY_NAMES = {
  all: "All Skills",
  languages: "Languages",
  frameworks: "Frameworks",
  databases: "Backend & Databases",
  tools: "Tools & DevOps",
  ui_tooling: "UI Tooling",
  fundamentals: "CS Fundamentals",
};

export default function SkillsNewbertUnderstands({
  profile = {},
  onProfileUpdated,
  onEdit,
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeSkill, setActiveSkill] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [manualSkillInput, setManualSkillInput] = useState("");
  const [addingSkill, setAddingSkill] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmingTech, setConfirmingTech] = useState(false);

  // Derive effective skills from profile or compute client fallback
  const effectiveSkills = profile.effectiveSkills || [];
  const targetRole = profile.targetRole || "Software Engineer";

  const counts = useMemo(() => {
    const verified = effectiveSkills.filter((s) =>
      ["VERIFIED_PROJECT_USAGE", "STRONG_REPEATED_PROJECT_USAGE", "VERIFIED_ASSESSMENT"].includes(s.evidenceStrength)
    ).length;
    const detected = effectiveSkills.filter((s) =>
      s.evidenceStrength === "DETECTED" || s.evidenceStrength === "STUDENT_CONFIRMED"
    ).length;
    const manual = effectiveSkills.filter((s) => s.evidenceStrength === "SELF_REPORTED").length;
    return { verified, detected, manual, total: effectiveSkills.length };
  }, [effectiveSkills]);

  const filteredSkills = useMemo(() => {
    if (selectedCategory === "all") return effectiveSkills;
    return effectiveSkills.filter((s) => s.category === selectedCategory);
  }, [effectiveSkills, selectedCategory]);

  const handleAddManualSkill = async (e) => {
    e.preventDefault();
    if (!manualSkillInput.trim()) return;
    setAddingSkill(true);
    setMessage("");

    try {
      const existing = (profile.skills || []).map((s) => (typeof s === "string" ? s : s.name));
      if (!existing.includes(manualSkillInput.trim())) {
        const nextSkills = [...(profile.skills || []), { name: manualSkillInput.trim(), score: 20, source: "manual" }];
        const { data } = await API.put("/profiles/me", { skills: nextSkills });
        if (onProfileUpdated) onProfileUpdated(data);
        setMessage(`Skill "${manualSkillInput.trim()}" added to your profile.`);
      }
      setManualSkillInput("");
      setAddModalOpen(false);
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not add skill.");
    } finally {
      setAddingSkill(false);
    }
  };

  const handleConfirmTechnology = async (projectId, techName) => {
    if (!projectId) return;
    setConfirmingTech(true);
    setMessage("");
    try {
      const result = await confirmProjectTechnologies(projectId, [techName]);
      if (onProfileUpdated) onProfileUpdated(result);
      setMessage(`Usage of ${techName} confirmed.`);
      if (activeSkill) {
        setActiveSkill((prev) =>
          prev
            ? {
                ...prev,
                evidenceStrength: prev.evidenceStrength === "DETECTED" ? "STUDENT_CONFIRMED" : prev.evidenceStrength,
                evidenceLabel: "Detected & student-confirmed",
              }
            : null
        );
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not confirm technology.");
    } finally {
      setConfirmingTech(false);
    }
  };

  return (
    <section
      id="skills"
      className="scroll-mt-32 mt-6 rounded-2xl border border-white/10 bg-[#111c2e] p-5 md:p-6 text-white"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-orange-400" />
            <p className="text-xs font-extrabold uppercase tracking-widest text-orange-400">
              SKILLS NEWBERT UNDERSTANDS
            </p>
          </div>
          <h2 className="mt-1 text-xl font-black text-white">Effective Skill Inventory</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Unified skill graph derived from GitHub repositories, verified projects, LeetCode, and profile evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-extrabold">
            <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-emerald-300">
              ✓ {counts.verified} Verified
            </span>
            <span className="rounded-md bg-orange-400/15 px-2 py-1 text-orange-300">
              ? {counts.detected} Detected
            </span>
            <span className="rounded-md bg-white/10 px-2 py-1 text-slate-300">
              {counts.manual} Self-reported
            </span>
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-black text-slate-950 shadow-md transition hover:bg-orange-400"
          >
            <Plus size={14} /> Add Skill Manually
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-3 text-xs font-bold text-orange-300 bg-orange-400/10 p-2.5 rounded-lg border border-orange-400/20">
          {message}
        </p>
      )}

      {/* Category Tabs */}
      <div className="mt-4 flex overflow-x-auto gap-1.5 pb-2 scrollbar-none">
        {Object.entries(CATEGORY_NAMES).map(([key, label]) => {
          const isActive = selectedCategory === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedCategory(key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                isActive
                  ? "bg-orange-400 text-slate-950"
                  : "bg-white/[.04] text-slate-400 hover:bg-white/[.08] hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Skills Grid */}
      {filteredSkills.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((item) => (
            <SkillCard
              key={item.canonical || item.skill}
              item={item}
              onViewEvidence={() => setActiveSkill(item)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-white/5 bg-[#0d1727] p-8 text-center">
          <p className="text-sm font-bold text-slate-300">
            No skills recorded in this category yet.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Add projects with code evidence or add a skill manually to build your profile.
          </p>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-orange-400 hover:underline"
          >
            <Plus size={13} /> Add manual skill
          </button>
        </div>
      )}

      {/* Skill Evidence Provenance Drawer */}
      <SkillEvidenceDrawer
        skill={activeSkill}
        targetRole={targetRole}
        onClose={() => setActiveSkill(null)}
        onConfirmTechnology={handleConfirmTechnology}
        confirming={confirmingTech}
      />

      {/* Add Manual Skill Modal */}
      <AddSkillModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        inputValue={manualSkillInput}
        onInputChange={setManualSkillInput}
        onSubmit={handleAddManualSkill}
        loading={addingSkill}
      />
    </section>
  );
}

function SkillCard({ item, onViewEvidence }) {
  const isVerified =
    item.evidenceStrength === "VERIFIED_PROJECT_USAGE" ||
    item.evidenceStrength === "STRONG_REPEATED_PROJECT_USAGE" ||
    item.evidenceStrength === "VERIFIED_ASSESSMENT";

  const isConfirmed = item.evidenceStrength === "STUDENT_CONFIRMED";
  const isDetected = item.evidenceStrength === "DETECTED";

  const strengthBadge = isVerified ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black text-emerald-300">
      <CheckCircle2 size={10} />
      {item.verifiedProjectCount >= 2
        ? `Verified · ${item.verifiedProjectCount} projects`
        : item.projectCount === 1
        ? "Verified in project"
        : "Verified"}
    </span>
  ) : isConfirmed ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-cyan-400/15 px-2 py-0.5 text-[10px] font-black text-cyan-300">
      ? Confirmed by you
    </span>
  ) : isDetected ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-orange-400/15 px-2 py-0.5 text-[10px] font-black text-orange-300">
      ? Detected in config
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
      Self-reported
    </span>
  );

  const relevanceTone =
    item.targetRelevance === "HIGH"
      ? "text-orange-400 border-orange-400/30 bg-orange-400/10"
      : item.targetRelevance === "MEDIUM"
      ? "text-blue-300 border-blue-400/30 bg-blue-400/10"
      : "text-slate-400 border-white/10 bg-white/5";

  return (
    <div
      onClick={onViewEvidence}
      className="group cursor-pointer rounded-xl border border-white/5 bg-[#0d1727] p-3.5 transition hover:border-orange-400/40 hover:bg-[#101b2e]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-black text-white group-hover:text-orange-300 transition">
          {item.skill}
        </h3>
        <span
          className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${relevanceTone}`}
        >
          {item.targetRelevance} Relevance
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {strengthBadge}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewEvidence();
          }}
          className="text-[11px] font-bold text-slate-400 group-hover:text-orange-400 transition inline-flex items-center gap-1"
        >
          <CircleHelp size={12} /> Evidence
        </button>
      </div>

      <p className="mt-2 text-[11px] text-slate-400 line-clamp-1">
        {item.summary || "Evidence derived from profile"}
      </p>
    </div>
  );
}

function SkillEvidenceDrawer({
  skill,
  targetRole,
  onClose,
  onConfirmTechnology,
  confirming,
}) {
  if (!skill) return null;

  const isVerified =
    skill.evidenceStrength === "VERIFIED_PROJECT_USAGE" ||
    skill.evidenceStrength === "STRONG_REPEATED_PROJECT_USAGE" ||
    skill.evidenceStrength === "VERIFIED_ASSESSMENT";

  const isDetected = skill.evidenceStrength === "DETECTED";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={onClose}
      >
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label={`Evidence for ${skill.skill}`}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          onMouseDown={(e) => e.stopPropagation()}
          className="ml-auto h-full w-full max-w-md overflow-y-auto bg-[#111c2e] p-6 text-white"
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-extrabold uppercase text-orange-400">
                Skill Evidence & Provenance
              </p>
              <h2 className="mt-1 text-2xl font-black">{skill.skill}</h2>
              <span className="mt-1 inline-block rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                Category: {skill.category}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 text-slate-300 hover:bg-white/10"
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-5 space-y-5 text-sm leading-6">
            {/* Core Classification Box */}
            <div className="rounded-xl border border-white/10 bg-[#0d1727] p-4 space-y-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Evidence Strength
                </span>
                <p className="text-sm font-black text-emerald-300">
                  {skill.evidenceLabel || "Verified project evidence"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Proficiency Assessment
                </span>
                <p className="text-xs font-bold text-slate-300">
                  {skill.proficiency === "STRONG"
                    ? "Strong (Verified via Problem Solving Benchmark)"
                    : skill.proficiency === "DEVELOPING"
                    ? "Developing (Multiple Project Implementations Verified)"
                    : "Unknown / Experience-proven (Not Formally Assessed)"}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Note: Code usage proves real experience, not formal examination mastery.
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Target Relevance
                </span>
                <p className="text-xs font-bold text-orange-300">
                  {skill.targetRelevance} Relevance for {targetRole}
                </p>
              </div>
            </div>

            {/* Detected UX Action Notice */}
            {isDetected && (
              <div className="rounded-xl border border-orange-400/30 bg-orange-400/10 p-4">
                <p className="text-xs font-black text-orange-300">
                  ? Configuration Detected
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Newbert found {skill.skill} dependencies or configuration in your project, but there was not enough component/code evidence yet to mark usage as fully verified.
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 italic">
                    Did you use this in your code?
                  </span>
                  {skill.sources.find((s) => s.projectId) && (
                    <button
                      type="button"
                      disabled={confirming}
                      onClick={() => {
                        const src = skill.sources.find((s) => s.projectId);
                        if (src) onConfirmTechnology(src.projectId, skill.skill);
                      }}
                      className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-orange-400 disabled:opacity-50"
                    >
                      {confirming ? "Confirming..." : "Confirm I used this"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Provenance Sources */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Where Newbert Found This Evidence
              </h3>

              <div className="mt-2.5 space-y-2.5">
                {skill.sources && skill.sources.length ? (
                  skill.sources.map((src, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-white/5 bg-[#0d1727] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-white flex items-center gap-1.5">
                          {src.source === "project" ? (
                            <FolderGit2 size={13} className="text-orange-400" />
                          ) : src.source === "leetcode" ? (
                            <Code2 size={13} className="text-emerald-400" />
                          ) : (
                            <Zap size={13} className="text-slate-400" />
                          )}
                          {src.project || src.repositoryName || src.label || "Student Profile"}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold ${
                            src.type === "verified_project_usage" || src.type === "overall_solved"
                              ? "text-emerald-300"
                              : src.type === "student_confirmed"
                              ? "text-cyan-300"
                              : src.type === "detected_in_project"
                              ? "text-orange-300"
                              : "text-slate-400"
                          }`}
                        >
                          {src.type === "verified_project_usage"
                            ? "✓ Verified Code Usage"
                            : src.type === "student_confirmed"
                            ? "? Student Confirmed"
                            : src.type === "detected_in_project"
                            ? "? Detected in Config"
                            : src.type === "overall_solved"
                            ? "✓ LeetCode Synced"
                            : "Self-Reported"}
                        </span>
                      </div>
                      {src.evidence && (
                        <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
                          {src.evidence}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">
                    No source breakdown available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}

function AddSkillModal({
  isOpen,
  onClose,
  inputValue,
  onInputChange,
  onSubmit,
  loading,
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4 backdrop-blur-[2px]">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111c2e] p-6 text-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-lg font-black text-white">Add Skill Manually</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-extrabold uppercase text-slate-400">
                Skill Name
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder="e.g. Docker, PostgreSQL, Go, Redis"
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#0b1220] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-400 focus:outline-none"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Manual skills are recorded as Self-reported until verified by GitHub repositories or assessments.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-orange-400 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Skill"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
