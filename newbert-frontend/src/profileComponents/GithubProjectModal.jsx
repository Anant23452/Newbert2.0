import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Code2,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Github,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import {
  addGithubProject,
  analyzeGithubRepository,
  getGithubRepositories,
} from "../Services/projectService";

export default function GithubProjectModal({ isOpen, onClose, onProjectAdded, connectedUsername }) {
  const [step, setStep] = useState("select"); // "select" | "analyzing" | "confirm"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repos, setRepos] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [confirmedTechs, setConfirmedTechs] = useState([]);
  const [customTechInput, setCustomTechInput] = useState("");
  const [isFeatured, setIsFeatured] = useState(true);
  const [liveUrl, setLiveUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Load repositories on open
  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setSelectedRepo(null);
      setAnalysis(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    getGithubRepositories()
      .then((data) => {
        setRepos(data.repositories || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Unable to fetch repositories from GitHub.");
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleStartAnalysis = async (repo) => {
    setSelectedRepo(repo);
    setStep("analyzing");
    setError("");
    try {
      const result = await analyzeGithubRepository({
        repositoryFullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
      });
      setAnalysis(result);
      setConfirmedTechs(result.confirmedTechnologies || result.technologies || []);
      setLiveUrl(result.liveUrl || repo.homepage || "");
      setStep("confirm");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze repository. Please try again.");
      setStep("select");
    }
  };

  const toggleTech = (tech) => {
    if (confirmedTechs.includes(tech)) {
      setConfirmedTechs(confirmedTechs.filter((t) => t !== tech));
    } else {
      setConfirmedTechs([...confirmedTechs, tech]);
    }
  };

  const handleAddCustomTech = (e) => {
    e.preventDefault();
    const trimmed = customTechInput.trim();
    if (trimmed && !confirmedTechs.includes(trimmed)) {
      setConfirmedTechs([...confirmedTechs, trimmed]);
      setCustomTechInput("");
    }
  };

  const handleSaveProject = async () => {
    if (!analysis || !selectedRepo) return;
    setSaving(true);
    setError("");
    try {
      const response = await addGithubProject({
        repositoryFullName: selectedRepo.fullName,
        repositoryName: selectedRepo.name,
        title: analysis.title || selectedRepo.name,
        description: selectedRepo.description,
        repoUrl: selectedRepo.url,
        liveUrl: liveUrl || null,
        confirmedTechnologies: confirmedTechs,
        analysis,
        isFeatured,
      });
      if (onProjectAdded) onProjectAdded(response.project, response.projects);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save project. Please try again.");
      setSaving(false);
    }
  };

  const filteredRepos = repos.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.language && r.language.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111c2e] p-6 text-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-400/10 text-orange-400">
                <Github size={22} />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-orange-400">Project Intelligence</p>
                <h2 className="text-xl font-black">
                  {step === "select"
                    ? "Select GitHub Repository"
                    : step === "analyzing"
                    ? "Inspecting Code & Evidence"
                    : "Confirm Project Evidence"}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-xs font-bold text-red-200">
              {error}
            </div>
          )}

          {/* STEP 1: SELECT REPOSITORY */}
          {step === "select" && (
            <div className="mt-4 space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your repositories by name or language..."
                  className="w-full rounded-lg border border-white/10 bg-[#0d1727] py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-400"
                />
              </div>

              {loading ? (
                <div className="flex h-56 flex-col items-center justify-center gap-3">
                  <Loader2 size={28} className="animate-spin text-orange-400" />
                  <p className="text-xs font-bold text-slate-400">Fetching your repositories from GitHub...</p>
                </div>
              ) : filteredRepos.length ? (
                <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                  {filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => handleStartAnalysis(repo)}
                      className="group flex cursor-pointer items-start justify-between rounded-xl border border-white/5 bg-[#0d1727] p-3.5 transition hover:border-orange-400/50 hover:bg-white/[.04]"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <FolderGit2 size={16} className="shrink-0 text-orange-400" />
                          <h4 className="truncate font-black text-white group-hover:text-orange-300">{repo.name}</h4>
                          {repo.isFork && (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">Fork</span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="mt-1 line-clamp-1 text-xs text-slate-400">{repo.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          {repo.language && (
                            <span className="flex items-center gap-1 font-bold text-slate-300">
                              <span className="h-2 w-2 rounded-full bg-orange-400" />
                              {repo.language}
                            </span>
                          )}
                          {repo.stars > 0 && (
                            <span className="flex items-center gap-1">
                              <Star size={12} className="text-amber-400" /> {repo.stars}
                            </span>
                          )}
                          <span className="text-slate-500">
                            Updated {new Date(repo.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mt-1 shrink-0 rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs font-extrabold text-orange-300 transition group-hover:bg-orange-500 group-hover:text-slate-950"
                      >
                        Analyze →
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-white/5 bg-[#0d1727] p-8 text-center">
                  <p className="text-sm font-bold text-slate-300">No matching repositories found.</p>
                  <p className="mt-1 text-xs text-slate-500">Make sure your repositories are public or your GitHub token is connected.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ANALYZING IN PROGRESS */}
          {step === "analyzing" && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-orange-400/10">
                <Loader2 size={32} className="animate-spin text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Deep-scanning {selectedRepo?.name}</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-400">
                  Inspecting manifest files, directory architecture, frameworks, and import usage patterns...
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-[11px] font-bold text-slate-400">
                <span className="rounded-full bg-white/5 px-2.5 py-1">✓ package.json / configs</span>
                <span className="rounded-full bg-white/5 px-2.5 py-1">✓ Docker & CI/CD</span>
                <span className="rounded-full bg-white/5 px-2.5 py-1">✓ Framework usage</span>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM & EDIT */}
          {step === "confirm" && analysis && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-orange-400/20 bg-orange-400/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-md bg-orange-400/20 px-2 py-0.5 text-[10px] font-black uppercase text-orange-300">
                      {analysis.evidenceLabel}
                    </span>
                    <h3 className="mt-1 text-lg font-black text-white">{analysis.title}</h3>
                    <p className="mt-1 text-xs text-slate-300">{analysis.description || "No description provided."}</p>
                  </div>
                  <a
                    href={analysis.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>

              {/* Detected technologies with evidence tags */}
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Detected Technologies <span className="text-[10px] font-normal lowercase">(click to toggle confirmation)</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.detectedTechnologies?.map((item) => {
                    const isConfirmed = confirmedTechs.includes(item.name);
                    const isStrong = item.level === "VERIFIED_PROJECT_USAGE";
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => toggleTech(item.name)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-extrabold transition ${
                          isConfirmed
                            ? isStrong
                              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                              : "border-orange-400/40 bg-orange-400/10 text-orange-200"
                            : "border-white/10 bg-white/5 text-slate-500 line-through opacity-60"
                        }`}
                      >
                        {isConfirmed && <CheckCircle2 size={13} className={isStrong ? "text-emerald-400" : "text-orange-400"} />}
                        <span>{item.name}</span>
                        <span className="text-[10px] opacity-70">
                          {isStrong ? "✓ verified" : "? detected"}
                        </span>
                      </button>
                    );
                  })}
                  {!analysis.detectedTechnologies?.length && (
                    <p className="text-xs text-slate-400">No high-confidence dependencies found. You can add technologies manually below.</p>
                  )}
                </div>
              </div>

              {/* Add Custom Tech Input */}
              <form onSubmit={handleAddCustomTech} className="flex gap-2">
                <input
                  type="text"
                  value={customTechInput}
                  onChange={(e) => setCustomTechInput(e.target.value)}
                  placeholder="Add another technology (e.g. Docker, Redis)..."
                  className="flex-1 rounded-lg border border-white/10 bg-[#0d1727] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-400"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                >
                  <Plus size={14} /> Add
                </button>
              </form>

              {/* Deployment URL & Featured Settings */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-400">Live Deployment URL (Optional)</label>
                  <input
                    type="url"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://my-app.vercel.app"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1727] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-400"
                  />
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="h-4 w-4 rounded accent-orange-500"
                  />
                  <label htmlFor="isFeatured" className="cursor-pointer text-xs font-bold text-slate-300">
                    Feature on Main Profile (Max 3)
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  disabled={saving}
                  className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
                >
                  ← Back to Repos
                </button>
                <button
                  type="button"
                  onClick={handleSaveProject}
                  disabled={saving || !confirmedTechs.length}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-xs font-black text-slate-950 shadow-md transition hover:bg-orange-400 disabled:opacity-40"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Saving Evidence...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Confirm & Feature Project
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
