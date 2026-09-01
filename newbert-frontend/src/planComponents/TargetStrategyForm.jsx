import {
  Briefcase,
  Building,
  Building2,
  Check,
  ChevronDown,
  Compass,
  Rocket,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getRoadmapTargetJobs, previewPlanContext } from "../Services/planService";

const ROLES = [
  "Software Engineer",
  "SDE Intern",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "ML Engineer",
  "Data Analyst",
  "Data Engineer",
  "DevOps / Cloud",
  "GATE",
];

const SUGGESTED_COMPANIES = {
  service: ["TCS", "Infosys", "Wipro", "Accenture", "Cognizant", "Capgemini", "Tech Mahindra", "HCLTech"],
  product: ["Microsoft", "Amazon", "Google", "Atlassian", "Adobe", "Flipkart", "Uber", "Oracle"],
  startup: ["Razorpay", "Zepto", "Swiggy", "Zomato", "Cred", "Postman", "Zerodha", "Groww"],
};

const BLOCKERS = [
  "Don't know what to study next",
  "Weak fundamentals",
  "Low DSA confidence",
  "No good projects",
  "Interview fear",
  "Too many resources",
];

function inferDomain(role) {
  const value = String(role || "").toLowerCase();
  if (value === "gate") return "gate";
  if (/data|machine learning|\bml\b/.test(value)) return "data-ai";
  if (/intern/.test(value)) return "internship";
  return "software-placement";
}

export default function TargetStrategyForm({
  profile,
  existingPlan,
  submitting,
  error,
  onCancel,
  onSubmit,
}) {
  const initial = existingPlan?.target || {};
  const [target, setTarget] = useState({
    companyCategory: initial.companyCategory || "product",
    company: initial.company || "",
    role: initial.role || profile.targetRole || "Software Engineer",
    type: initial.type || inferDomain(initial.role || profile.targetRole),
    targetType: initial.company ? "specific_company" : "company_category",
    region: initial.region || "India",
    jobIds: (initial.jobIds || []).map(String),
    deadline: initial.deadline ? new Date(initial.deadline).toISOString().slice(0, 10) : "",
    weeklyHours: initial.weeklyHours ?? "",
    planStyle: initial.planStyle || "balanced",
    currentStageStory: existingPlan?.selfAssessment?.currentStageStory || "",
    blockers: existingPlan?.selfAssessment?.blockers || [],
    completedAreas: existingPlan?.selfAssessment?.completedAreas || [],
  });

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    let active = true;
    getRoadmapTargetJobs()
      .then((value) => {
        if (active) setJobs(value);
      })
      .catch(() => {
        if (active) setJobs([]);
      })
      .finally(() => {
        if (active) setLoadingJobs(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = (key, value) => {
    setPreview(null);
    setTarget((current) => ({ ...current, [key]: value }));
  };

  const chooseCategory = (category) => {
    setPreview(null);
    setTarget((current) => ({
      ...current,
      companyCategory: category,
      targetType: current.company ? "specific_company" : "company_category",
    }));
  };

  const chooseRole = (role) => {
    setPreview(null);
    setTarget((current) => ({
      ...current,
      role,
      type: inferDomain(role),
      ...(role === "GATE" ? { company: "", jobIds: [] } : {}),
    }));
  };

  const toggleJob = (job) => {
    setPreview(null);
    setTarget((current) => {
      const exists = current.jobIds.includes(job.id);
      const jobIds = exists ? current.jobIds.filter((id) => id !== job.id) : [...current.jobIds, job.id].slice(0, 5);
      return {
        ...current,
        jobIds,
        company: jobIds.length === 1 && !exists ? job.company : current.company,
        role: current.role || job.title,
        type: inferDomain(current.role || job.title),
        targetType: "specific_company",
      };
    });
  };

  const requestPreview = async () => {
    setPreviewing(true);
    setPreviewError("");
    try {
      setPreview(
        await previewPlanContext({
          ...target,
          mode: target.jobIds.length ? "job" : "role",
          targetType: target.company.trim() ? "specific_company" : "company_category",
          weeklyHours: target.weeklyHours === "" ? null : Number(target.weeklyHours),
        })
      );
    } catch (requestError) {
      setPreviewError(requestError.response?.data?.message || "Newbert could not review this target yet.");
    } finally {
      setPreviewing(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      ...target,
      mode: target.jobIds.length ? "job" : "role",
      targetType: target.company.trim() ? "specific_company" : "company_category",
      company: target.company.trim() || null,
      companyCategory: target.companyCategory || "product",
      weeklyHours: target.weeklyHours === "" ? null : Number(target.weeklyHours),
      understoodCurrentStage: preview?.understoodCurrentStage,
    };
    if (!preview) return requestPreview();
    return onSubmit(payload);
  };

  const suggestions = SUGGESTED_COMPANIES[target.companyCategory] || SUGGESTED_COMPANIES.product;

  return (
    <main className="min-h-screen bg-[#0b1220] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-orange-300">
          <Target className="h-4 w-4" /> Target Strategy Selection
        </div>
        <h1 className="mt-3 text-3xl font-black md:text-5xl">Where do you want to get hired?</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
          Choose your target company category. Selecting a specific company is completely optional—Newbert personalizes your roadmap from category expectations and your evidence.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          {/* STEP 1: What kind of company are you targeting? */}
          <section className="rounded-2xl border border-white/10 bg-[#111c30] p-6 md:p-8">
            <Step number="1" title="What kind of company are you targeting?" />
            <p className="mt-2 text-xs text-slate-400">
              Primary target choice that shapes preparation expectations, benchmark weighting, and gap classification.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <CategoryCard
                icon={<Rocket className="h-6 w-6 text-orange-400" />}
                title="STARTUP"
                detail="Practical engineering, full-stack implementation, APIs, deployment, and verifiable GitHub projects."
                active={target.companyCategory === "startup"}
                onClick={() => chooseCategory("startup")}
              />
              <CategoryCard
                icon={<Building2 className="h-6 w-6 text-sky-400" />}
                title="PRODUCT-BASED"
                detail="Algorithmic problem solving, DSA pattern mastery, CS core depth, and system design."
                active={target.companyCategory === "product"}
                onClick={() => chooseCategory("product")}
              />
              <CategoryCard
                icon={<Building className="h-6 w-6 text-emerald-400" />}
                title="SERVICE-BASED"
                detail="Online aptitude tests, foundational programming, DBMS/SQL, OOP, and communication clarity."
                active={target.companyCategory === "service"}
                onClick={() => chooseCategory("service")}
              />
            </div>
          </section>

          {/* STEP 2: Do you have a specific company in mind? (Optional) */}
          <section className="rounded-2xl border border-white/10 bg-[#111c30] p-6 md:p-8">
            <div className="flex items-center justify-between">
              <Step number="2" title="Do you have a specific company in mind?" />
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-slate-300">
                Optional
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              If you have a dream employer, type it below to refine your strategy with company-specific assessment patterns. Otherwise, leave it empty or click skip.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={target.company}
                    onChange={(e) => update("company", e.target.value)}
                    placeholder={`e.g. ${suggestions.slice(0, 3).join(", ")}, or leave blank`}
                    className="w-full rounded-lg border border-white/15 bg-[#0b1425] px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-orange-400 focus:outline-none"
                  />
                  {target.company && (
                    <button
                      type="button"
                      onClick={() => update("company", "")}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {target.company ? (
                  <button
                    type="button"
                    onClick={() => update("company", "")}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
                  >
                    Clear & Skip
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => update("company", "")}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-400"
                  >
                    Skip for now
                  </button>
                )}
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400">Popular {target.companyCategory} companies:</span>
                {suggestions.map((comp) => (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => update("company", comp)}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                      target.company.toLowerCase() === comp.toLowerCase()
                        ? "bg-orange-400 text-slate-950"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {comp}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* STEP 3: Role Targeting */}
          <section className="rounded-2xl border border-white/10 bg-[#111c30] p-6 md:p-8">
            <Step number="3" title="What role are you targeting?" />
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map((role) => (
                <button
                  type="button"
                  key={role}
                  onClick={() => chooseRole(role)}
                  className={`rounded-lg px-4 py-3 text-left text-sm font-bold transition ${
                    target.role === role
                      ? "bg-orange-400 text-slate-950"
                      : "bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="text-xs font-black uppercase text-slate-400">
                Or enter another custom role
              </label>
              <input
                type="text"
                value={target.role}
                onChange={(e) => {
                  update("role", e.target.value);
                  update("type", inferDomain(e.target.value));
                }}
                placeholder="Example: Software Engineer Intern, Cloud Engineer"
                className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#0b1425] px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-orange-400 focus:outline-none"
                required
              />
            </div>
          </section>

          {/* STEP 4: Planning Context */}
          <section className="rounded-2xl border border-white/10 bg-[#111c30] p-6 md:p-8">
            <Step number="4" title="Planning Context & Current Stage" />
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-black uppercase text-slate-400">Target Date (Optional)</label>
                <input
                  type="date"
                  value={target.deadline}
                  onChange={(e) => update("deadline", e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#0b1425] px-4 py-3 text-sm text-white focus:border-orange-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400">Weekly Hours Available</label>
                <input
                  type="number"
                  value={target.weeklyHours}
                  onChange={(e) => update("weeklyHours", e.target.value)}
                  placeholder="e.g. 15"
                  min="1"
                  max="80"
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#0b1425] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-orange-400 focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-white/5 bg-[#0b1425] p-3.5">
                <p className="text-[11px] font-black uppercase text-slate-400">Verified Evidence Connected</p>
                <p className="mt-1.5 text-xs font-bold text-slate-200">
                  GitHub: {profile.connections?.github?.connected ? "✓ Connected" : "Not connected"}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-200">
                  LeetCode: {profile.connections?.leetcode?.connected ? "✓ Connected" : "Not connected"}
                </p>
              </div>
            </div>

            <details className="mt-6 rounded-xl border border-white/5 bg-[#0b1425] p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold uppercase text-slate-300">
                Add current stage story or focus areas <ChevronDown className="h-4 w-4" />
              </summary>
              <textarea
                value={target.currentStageStory}
                onChange={(e) => update("currentStageStory", e.target.value)}
                rows="4"
                placeholder="What topics have you completed, what feels weak, and what are you actively studying?"
                className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-[#111c30] px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-orange-400 focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {BLOCKERS.map((blocker) => (
                  <button
                    type="button"
                    key={blocker}
                    onClick={() =>
                      update(
                        "blockers",
                        target.blockers.includes(blocker)
                          ? target.blockers.filter((item) => item !== blocker)
                          : [...target.blockers, blocker]
                      )
                    }
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                      target.blockers.includes(blocker)
                        ? "bg-orange-400 text-slate-950"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {blocker}
                  </button>
                ))}
              </div>
            </details>
          </section>

          {(error || previewError) && (
            <p className="rounded-xl border border-red-500/30 bg-red-400/10 p-4 text-xs font-bold text-red-200">
              {error || previewError}
            </p>
          )}

          {preview && <Preview preview={preview} onEdit={() => setPreview(null)} />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              disabled={submitting || previewing || !target.role.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 disabled:opacity-50"
            >
              {submitting ? "Building strategy..." : previewing ? "Analyzing evidence..." : preview ? "Build Roadmap Strategy" : "Review What Newbert Understood"}
              <Search className="h-4 w-4" />
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-xs font-bold text-slate-300 hover:bg-white/10"
              >
                Keep Current Strategy
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

function Step({ number, title }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-500 text-xs font-black text-slate-950">
        {number}
      </span>
      <h2 className="text-lg font-black text-white">{title}</h2>
    </div>
  );
}

function CategoryCard({ icon, title, detail, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-5 text-left transition ${
        active
          ? "border-orange-400 bg-orange-400/10 shadow-lg shadow-orange-500/10"
          : "border-white/5 bg-[#0b1425] hover:border-white/15 hover:bg-[#0e192e]"
      }`}
    >
      <div className="flex items-center justify-between">
        {icon}
        {active && (
          <span className="rounded bg-orange-400 px-2 py-0.5 text-[9px] font-black uppercase text-slate-950">
            Selected
          </span>
        )}
      </div>
      <p className="mt-3 font-black text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
    </button>
  );
}

function Preview({ preview, onEdit }) {
  const lines = [
    ...(preview.profileSignals || []),
    ...(preview.understoodCurrentStage?.completed || []).map((item) => `${item} recorded as completed`),
    ...(preview.understoodCurrentStage?.weakAreas || []).map((item) => `${item} needs attention`),
  ];
  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-emerald-400/10 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-emerald-300">What Newbert understands</p>
          <h2 className="mt-1 text-lg font-black text-white">Target and Evidence Review</h2>
        </div>
        <button type="button" onClick={onEdit} className="text-xs font-bold text-orange-300 hover:underline">
          Edit inputs
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {lines.length ? (
          lines.map((line) => (
            <p key={line} className="flex gap-2 text-xs text-slate-300">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
              {line}
            </p>
          ))
        ) : (
          <p className="text-xs text-slate-400">
            Strategy will be generated using target category expectations and your connected evidence.
          </p>
        )}
      </div>
    </section>
  );
}
