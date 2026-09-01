import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Layers,
  Search,
  Sparkles,
  Star,
  Target,
  Zap,
} from "lucide-react";
import { getRecommendedCourses, listCourses } from "../Services/courseService";
import CourseFitDrawer from "../courseComponents/CourseFitDrawer";

const TABS = ["All", "DSA", "DBMS", "Web Development", "JavaScript", "System Design", "Core", "Free"];

export default function Courses() {
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [recommendedData, setRecommendedData] = useState(null);
  const [catalogData, setCatalogData] = useState({ courses: [], context: {} });
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourseFit, setSelectedCourseFit] = useState(null);

  // Load top personalized recommendations
  useEffect(() => {
    let active = true;
    setLoadingRecommended(true);
    getRecommendedCourses()
      .then((res) => {
        if (active) setRecommendedData(res);
      })
      .catch((err) => {
        console.error("Recommended courses fetch failed:", err);
      })
      .finally(() => {
        if (active) setLoadingRecommended(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Load filtered catalog
  useEffect(() => {
    let active = true;
    setLoadingCatalog(true);
    const timer = setTimeout(() => {
      listCourses({
        search: search || undefined,
        category: !["All", "Free"].includes(tab) ? tab : undefined,
        free: tab === "Free" || undefined,
      })
        .then((result) => {
          if (active) {
            setCatalogData(result);
            setError("");
          }
        })
        .catch((requestError) => {
          if (active) setError(requestError.response?.data?.message || "Unable to load courses.");
        })
        .finally(() => {
          if (active) setLoadingCatalog(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [tab, search]);

  const contextGaps = recommendedData?.context?.priorityGaps || catalogData.context?.priorityGaps || [];
  const targetRole = recommendedData?.context?.goal || catalogData.context?.goal || "Software Engineer";

  return (
    <main className="min-h-screen bg-[#0b1220] px-4 py-10 text-white md:px-6 md:py-14">
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Page Header */}
        <header className="max-w-3xl">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-orange-400" />
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-orange-400">
              Deterministic Course Match Engine
            </p>
          </div>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">Personalized Learning Resources</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Ranked for your specific target role (<span className="font-bold text-orange-300">{targetRole}</span>) and active roadmap skill gaps.
          </p>

          {contextGaps.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Your Priority Gaps:</span>
              {contextGaps.map((gap) => (
                <span key={gap.skill || gap} className="rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-1 text-xs font-bold text-orange-200">
                  {gap.skill || gap}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* SECTION 1: TOP STRATEGIC PICKS */}
        <section className="space-y-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-orange-400">Roadmap Intelligence</p>
            <h2 className="mt-1 text-2xl font-black text-white">Recommended for Your Roadmap</h2>
          </div>

          {loadingRecommended ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : recommendedData?.noCourseAdvisory ? (
            /* "No Course Required" Advisory Card */
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-emerald-100">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500 text-slate-950 font-black">
                  ✓
                </div>
                <div>
                  <span className="rounded bg-emerald-400/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                    Targeted Practice Mode
                  </span>
                  <h3 className="mt-1 text-xl font-black text-white">{recommendedData.noCourseAdvisory.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-emerald-200">
                    {recommendedData.noCourseAdvisory.message}
                  </p>
                  <Link
                    to="/roadmap"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-300"
                  >
                    {recommendedData.noCourseAdvisory.suggestedAction} →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {/* BEST MATCH */}
              {recommendedData?.bestMatch && (
                <StrategicCourseCard
                  badge="Best Match"
                  badgeColor="bg-orange-500 text-slate-950"
                  item={recommendedData.bestMatch}
                  onWhy={() => setSelectedCourseFit(recommendedData.bestMatch)}
                />
              )}

              {/* FASTEST GAP CLOSER */}
              {recommendedData?.fastestCloser && (
                <StrategicCourseCard
                  badge="Fastest Gap Closer"
                  badgeColor="bg-cyan-400 text-slate-950"
                  item={recommendedData.fastestCloser}
                  onWhy={() => setSelectedCourseFit(recommendedData.fastestCloser)}
                />
              )}

              {/* BEST FREE OPTION */}
              {recommendedData?.bestFree && (
                <StrategicCourseCard
                  badge="Best Free Option"
                  badgeColor="bg-emerald-400 text-slate-950"
                  item={recommendedData.bestFree}
                  onWhy={() => setSelectedCourseFit(recommendedData.bestFree)}
                />
              )}
            </div>
          )}
        </section>

        {/* SECTION 2: EXPLORE ALL COURSES CATALOG */}
        <section className="space-y-5 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Full Catalog</p>
              <h2 className="mt-1 text-2xl font-black text-white">Explore All Learning Resources</h2>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by topic, skill, or provider..."
                className="w-full rounded-xl border border-white/10 bg-[#111c2e] py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-400 md:w-72"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 border-y border-white/5 py-3">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  tab === item
                    ? "bg-orange-500 text-slate-950 shadow"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {error && <p className="text-sm font-bold text-red-300">{error}</p>}

          {loadingCatalog ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          ) : catalogData.courses.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {catalogData.courses.map((item) => (
                <CatalogCourseCard
                  key={item.course._id}
                  item={item}
                  onWhy={() => setSelectedCourseFit(item)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-slate-400">
              No reviewed courses match this view yet.
            </div>
          )}
        </section>
      </div>

      {/* Course Fit Breakdown Drawer */}
      <CourseFitDrawer
        item={selectedCourseFit}
        onClose={() => setSelectedCourseFit(null)}
      />
    </main>
  );
}

function StrategicCourseCard({ badge, badgeColor, item, onWhy }) {
  const { course, match } = item;
  return (
    <article className="flex flex-col justify-between rounded-2xl border border-orange-400/20 bg-[#111c2e] p-5 shadow-xl transition hover:border-orange-400/50">
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
            {badge}
          </span>
          <span className="rounded-lg bg-orange-500/20 px-2 py-1 text-xs font-black text-orange-300">
            {match.score ?? match.fitScore}% Fit
          </span>
        </div>

        <h3 className="mt-3 text-lg font-black text-white">{course.title}</h3>
        <p className="mt-1 text-xs text-slate-400">
          {course.provider} · {course.estimatedHours ? `${course.estimatedHours} hrs` : "Self-paced"} · {course.price || course.priceType}
        </p>

        {/* Why this course preview */}
        <div className="mt-3 space-y-1">
          {match.reasons?.slice(0, 2).map((reason) => (
            <p key={reason} className="text-xs text-slate-300">
              {reason}
            </p>
          ))}
        </div>

        {/* Missing skills covered */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(match.missingSkills || course.skillsCovered || []).slice(0, 3).map((s) => (
            <span key={s} className="rounded bg-orange-400/10 px-2 py-0.5 text-[11px] font-bold text-orange-200">
              Build: {s}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={onWhy}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-300 hover:underline"
        >
          <HelpCircle size={13} /> Why this course?
        </button>
        <a
          href={course.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-black text-white hover:text-orange-300"
        >
          Open ↗
        </a>
      </div>
    </article>
  );
}

function CatalogCourseCard({ item, onWhy }) {
  const { course, match } = item;
  return (
    <article className="flex flex-col justify-between rounded-xl border border-white/5 bg-[#111c2e] p-5 transition hover:border-white/20">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-orange-300">{course.provider}</p>
            <h3 className="mt-1 text-base font-black text-white">{course.title}</h3>
            <p className="mt-1 text-xs text-slate-400">
              {course.category} · {course.level} · {course.price || course.priceType} {course.estimatedHours && `· ${course.estimatedHours} hrs`}
            </p>
          </div>
          {match.score != null && (
            <span className="shrink-0 rounded-lg bg-orange-500 px-2.5 py-1 text-xs font-black text-slate-950">
              {match.score}% Fit
            </span>
          )}
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{course.description}</p>

        {/* Subtle Roadmap Fit Badges */}
        {match.score >= 65 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 text-[10px] font-black text-orange-300">
              🎯 {match.score}% fit for your roadmap
            </span>
            {match.coveredGaps?.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                🎯 Matches your {match.coveredGaps[0]} gap
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(course.skillsCovered || []).slice(0, 4).map((s) => (
            <span key={s} className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
        <button
          type="button"
          onClick={onWhy}
          className="text-xs font-extrabold text-orange-300 hover:underline"
        >
          Why this course?
        </button>
        <div className="flex items-center gap-3">
          <Link to={`/courses/${course._id}`} className="text-xs font-bold text-slate-300 hover:text-white">
            Details
          </Link>
          <a
            href={course.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/20"
          >
            Open Course ↗
          </a>
        </div>
      </div>
    </article>
  );
}
