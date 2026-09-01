import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../Services/api";
import useAuth from "../hook/useAuth";
import { addAlumniPathToRoadmap, compareWithAlumni, createMentorshipRequest } from "../Services/alumniService";

function pathsOf(alumni) { if (alumni.careerPaths?.length) return alumni.careerPaths; return [(["gate", "psu"].includes(alumni.path || alumni.outcomeType) ? "gate" : "placement")]; }

export default function AlumniIntelligenceProfile() {
  const { alumniId } = useParams(); const navigate = useNavigate(); const { isAuthenticated } = useAuth();
  const [alumni, setAlumni] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [activePath, setActivePath] = useState("");
  const [comparison, setComparison] = useState({ loading: false, data: null, error: "" }); const [bookingOpen, setBookingOpen] = useState(false); const [roadmapStatus, setRoadmapStatus] = useState("");
  useEffect(() => { const controller = new AbortController(); API.get(`/alumni/${alumniId}`, { signal: controller.signal }).then(({ data }) => { setAlumni(data.alumni); setActivePath(pathsOf(data.alumni)[0]); }).catch((requestError) => { if (requestError.code !== "ERR_CANCELED") setError(requestError.response?.data?.message || "Alumni profile not found."); }).finally(() => setLoading(false)); return () => controller.abort(); }, [alumniId]);
  const compare = async () => { if (!isAuthenticated) { setComparison({ loading: false, data: null, error: "Sign in and complete your profile to compare paths." }); return; } setComparison({ loading: true, data: null, error: "" }); try { setComparison({ loading: false, data: await compareWithAlumni(alumniId, activePath), error: "" }); } catch (requestError) { setComparison({ loading: false, data: null, error: requestError.response?.data?.message || "Comparison could not be built." }); } };
  const addToRoadmap = async () => { setRoadmapStatus("Adding evidence..."); try { const data = await addAlumniPathToRoadmap(alumniId, activePath); setRoadmapStatus(data.message); } catch (requestError) { setRoadmapStatus(requestError.response?.data?.message || "Evidence could not be added."); } };
  if (loading) return <ProfileSkeleton/>;
  if (!alumni) return <main className="mx-auto max-w-4xl px-5 py-16"><h1 className="text-2xl font-extrabold">{error || "Alumni profile not found"}</h1><button onClick={() => navigate("/alumni-wall")} className="mt-4 font-bold text-orange-700">Back to alumni outcomes</button></main>;
  const paths = pathsOf(alumni); const firstName = alumni.name.split(" ")[0];
  return <main className="mx-auto max-w-6xl px-5 py-10 md:py-14"><button onClick={() => navigate("/alumni-wall")} className="text-sm font-bold text-orange-700">← Back to alumni outcomes</button><ProfileHeader alumni={alumni} paths={paths}/>
    {paths.length > 1 && <div className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white p-1">{paths.map((path) => <button key={path} onClick={() => { setActivePath(path); setComparison({ loading: false, data: null, error: "" }); }} className={`rounded-md px-4 py-2 text-sm font-extrabold capitalize ${activePath === path ? "bg-orange-500 text-slate-950" : "text-slate-600"}`}>{path} path</button>)}</div>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]"><div className="space-y-6"><Outcome alumni={alumni} path={activePath}/>{activePath === "placement" ? <PlacementPreparation alumni={alumni}/> : <GatePreparation alumni={alumni}/>}<Journey alumni={alumni} path={activePath}/><Courses courses={(alumni.courses || []).filter((course) => course.path === activePath)}/><Advice alumni={alumni}/><Comparison state={comparison}/></div>
      <aside><section className="surface rounded-2xl border border-slate-200 p-5 lg:sticky lg:top-24"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Compare with me</p><h2 className="mt-2 text-xl font-black text-slate-950">How is your path different?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Newbert compares only available evidence for you and {firstName}. It is not an outcome probability.</p><button onClick={compare} disabled={comparison.loading} className="mt-5 w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-extrabold text-slate-950 disabled:opacity-50">{comparison.loading ? "Comparing..." : "Compare with me"}</button>{isAuthenticated && <button onClick={addToRoadmap} className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-extrabold text-slate-700">Use this path in my roadmap</button>}{roadmapStatus && <p className="mt-3 text-xs font-bold text-slate-500">{roadmapStatus}</p>}
        {alumni.mentorshipEnabled ? (
          <button onClick={() => setBookingOpen(true)} className="mt-3 w-full rounded-lg border border-orange-300 px-4 py-3 text-sm font-extrabold text-orange-800 hover:bg-orange-50 transition-colors">Request mentorship</button>
        ) : (
          <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 text-center">Not accepting mentorship requests currently.</p>
        )}
        <Link to="/mentorship" className="mt-4 block text-center text-xs font-extrabold text-orange-700">My mentorship requests</Link></section></aside>
    </div>
    <AnimatePresence>{bookingOpen && <BookingDialog alumni={alumni} path={activePath} onClose={() => setBookingOpen(false)}/>}</AnimatePresence>
  </main>;
}

function ProfileHeader({ alumni, paths }) { return <header className="surface mt-5 overflow-hidden rounded-2xl border border-slate-200"><div className="h-24 bg-[#2c1c18]"/><div className="p-6 md:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end"><div className="-mt-16 grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 border-white bg-orange-100 text-2xl font-black text-orange-700">{alumni.avatarUrl ? <img src={alumni.avatarUrl} alt="" className="h-full w-full object-cover"/> : alumni.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div className="flex-1"><div className="flex flex-wrap gap-2">{paths.map((path) => <span key={path} className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-extrabold uppercase text-orange-800">{path}</span>)}{alumni.isDummyData && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Demo profile</span>}</div><h1 className="mt-2 text-3xl font-black text-slate-950">{alumni.name}</h1><p className="mt-1 text-sm text-slate-600">{alumni.branch || "Branch not listed"} · {alumni.college} · Class of {alumni.graduationYear || alumni.batch}</p></div></div>{alumni.bio && <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">{alumni.bio}</p>}</div></header>; }
function Outcome({ alumni, path }) { const outcome = path === "placement" ? alumni.placementOutcome || alumni.placement || {} : alumni.gateOutcome || alumni.gate || {}; const items = path === "placement" ? [["Company", outcome.company || alumni.company], ["Role", outcome.role || alumni.role], ["Package", outcome.packageLpa != null ? `${outcome.packageLpa} LPA` : alumni.package != null ? `${alumni.package} LPA` : null], ["Offer", outcome.offerType]] : [["Paper", outcome.paper], ["AIR", outcome.air || alumni.gateAIR], ["Score", outcome.score], ["Outcome", outcome.institute || outcome.psu || outcome.outcomeType]]; return <Section title={path === "placement" ? "Placement Outcome" : "GATE Outcome"}><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{items.map(([label, value]) => <Data key={label} label={label} value={value}/>)}</div></Section>; }
function PlacementPreparation({ alumni }) { const prep = alumni.placementPreparation; if (!prep) return <Unavailable text="Detailed placement preparation has not been submitted."/>; const dsa = prep.dsa || {}; const development = prep.development || {}; const fundamentals = prep.csFundamentals || {}; const interview = prep.interviewPreparation || {}; return <><Section title="DSA"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Data label="Total solved" value={dsa.totalSolved}/><Data label="Easy" value={dsa.easy}/><Data label="Medium" value={dsa.medium}/><Data label="Hard" value={dsa.hard}/></div><Tags values={dsa.strongTopics}/><Body>{dsa.strategy}</Body></Section><Section title="Projects & Development"><Tags values={development.skills}/>{(development.projects || []).map((project, index) => <Body key={project.title || index}>{project.title || project.name || String(project)}</Body>)}</Section><Section title="CS Fundamentals"><Tags values={fundamentals.subjects}/><Body>{fundamentals.revisionStrategy}</Body></Section><Section title="Interview Experience"><Data label="Mock interviews" value={interview.mockInterviews}/><Tags values={interview.importantTopics}/><Body>{interview.strategy}</Body></Section></>; }
function GatePreparation({ alumni }) { const prep = alumni.gatePreparation; if (!prep) return <Unavailable text="Detailed GATE preparation has not been submitted."/>; return <><Section title="Subject Mastery"><div className="grid gap-3 sm:grid-cols-2">{(prep.subjects || []).map((subject) => <div key={subject.subject} className="rounded-lg border border-slate-200 p-4"><div className="flex justify-between gap-3"><p className="font-extrabold text-slate-950">{subject.subject}</p><span className="text-xs font-bold capitalize text-orange-700">{subject.strength || "Not rated"}</span></div><p className="mt-2 text-xs text-slate-500">{subject.revisionCount != null ? `${subject.revisionCount} revisions` : "Revision count unavailable"}{subject.questionPracticeCount != null ? ` · ${subject.questionPracticeCount} questions` : ""}</p></div>)}</div></Section><Section title="Test Series & Mock Practice">{prep.testSeries?.length ? prep.testSeries.map((series, index) => <div key={series.provider || index} className="border-b border-slate-100 py-3 last:border-0"><p className="font-bold text-slate-900">{series.provider || "Test series"}</p><p className="mt-1 text-sm text-slate-600">{series.testCountAttempted != null ? `${series.testCountAttempted} tests` : "Test count unavailable"}{series.averageScore != null ? ` · Average ${series.averageScore}` : ""}</p><Body>{series.review}</Body></div>) : <p className="text-sm text-slate-500">Unavailable</p>}</Section><Section title="PYQ Strategy">{prep.previousYearQuestions ? <><Data label="Years covered" value={prep.previousYearQuestions.yearsCovered}/><Body>{prep.previousYearQuestions.strategy}</Body></> : <p className="text-sm text-slate-500">Unavailable</p>}</Section><Section title="Revision Strategy">{prep.revisionStrategy ? <><Data label="Revision cycles" value={prep.revisionStrategy.cycles}/><Body>{prep.revisionStrategy.lastMonthStrategy || prep.revisionStrategy.formulaRevision}</Body></> : <p className="text-sm text-slate-500">Unavailable</p>}</Section></>; }
function Journey({ alumni, path }) { const phases = path === "placement" ? alumni.placementPreparation?.preparationPhases : alumni.gatePreparation?.preparationPhases; return <Section title="Preparation Journey">{phases?.length ? <div className="space-y-4 border-l-2 border-orange-200 pl-5">{[...phases].sort((a, b) => (a.order || 0) - (b.order || 0)).map((phase, index) => <article key={`${phase.title}-${index}`}><p className="text-xs font-extrabold uppercase text-orange-700">Phase {phase.order || index + 1}{phase.duration ? ` · ${phase.duration}` : ""}</p><h3 className="mt-1 font-black text-slate-950">{phase.title}</h3><Body>{phase.description}</Body><Tags values={phase.focus}/></article>)}</div> : <p className="text-sm text-slate-500">Structured preparation phases have not been submitted.</p>}</Section>; }
function Courses({ courses }) { return <Section title="Courses / Resources">{courses.length ? <div className="grid gap-3 sm:grid-cols-2">{courses.map((course, index) => <article key={`${course.courseName}-${index}`} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><h3 className="font-black text-slate-950">{course.courseName}</h3><span className="text-sm font-black text-orange-700">{course.rating != null ? `${course.rating}/5` : "Not rated"}</span></div><p className="mt-1 text-xs text-slate-500">{course.provider || "Provider not listed"} · {course.completed === true ? "Completed" : course.completed === false ? "Not completed" : "Completion unavailable"}</p><Body>{course.review}</Body><Tags values={course.helpedWith}/>{course.wouldRecommend != null && <p className="mt-3 text-xs font-extrabold text-slate-700">Would recommend: {course.wouldRecommend ? "Yes" : "No"}</p>}</article>)}</div> : <p className="text-sm text-slate-500">No course or resource history submitted.</p>}</Section>; }
function Advice({ alumni }) { const advice = alumni.adviceDetails; return <Section title="Advice">{advice ? <div className="grid gap-4 sm:grid-cols-2">{[["Biggest mistake", advice.biggestMistake], ["What worked", advice.whatWorked], ["Would do differently", advice.wouldDoDifferently], ["Advice for juniors", advice.adviceForJuniors]].filter(([, value]) => value).map(([label, value]) => <div key={label}><p className="text-xs font-extrabold uppercase text-orange-700">{label}</p><Body>{value}</Body></div>)}</div> : alumni.advice ? <Body>{alumni.advice}</Body> : <p className="text-sm text-slate-500">Advice has not been submitted.</p>}</Section>; }
function Comparison({ state }) { if (!state.loading && !state.data && !state.error) return null; if (state.error) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">{state.error}</p>; if (state.loading) return <div className="h-48 animate-pulse rounded-2xl bg-slate-200"/>; const data = state.data; const skills = data.evidenceComparison?.skills || []; return <Section title="Your Path Comparison"><div className="flex flex-wrap gap-3"><Data label="Similarity" value={data.similarity?.band?.replaceAll("_", " ")}/><Data label="Confidence" value={data.confidence?.level}/><Data label="Comparable fields" value={data.confidence?.comparableFields}/></div>{skills.length > 0 && <details className="mt-5"><summary className="cursor-pointer text-sm font-extrabold text-orange-700">Compare skill evidence</summary><div className="mt-3 space-y-2">{skills.slice(0, 10).map((item) => <div key={item.skill} className="grid gap-2 rounded-lg border border-slate-200 p-3 text-sm sm:grid-cols-[1fr_1fr_1fr_70px]"><p className="font-extrabold text-slate-950">{item.skill}</p><p className="text-slate-600">You: {item.student.score ?? "Unavailable"}{item.student.score != null ? ` · ${item.student.level.replaceAll("_", " ")}` : ""}</p><p className="text-slate-600">Senior: {item.senior.score ?? "Unavailable"}{item.senior.score != null ? ` · ${item.senior.level.replaceAll("_", " ")}` : ""}</p><p className="font-bold text-orange-700">Gap {item.gap ?? "N/A"}</p></div>)}</div>{data.evidenceComparison.studentLeetcodeTopics?.topicEvidenceAvailable === false && <p className="mt-3 text-xs text-slate-500">Your total LeetCode solved count is available, but topic-level evidence is unavailable.</p>}</details>}<div className="mt-5 space-y-4">{data.dimensions.map((item) => <CompareDimension key={item.key} item={item}/>)}</div><InsightList title="Common Strengths" items={data.commonStrengths}/><InsightList title="Main Differences" items={data.differences}/><InsightList title="What You Can Learn" items={data.learnableInsights}/><p className="mt-5 text-xs font-semibold text-slate-500">This describes available evidence. It does not predict or guarantee the same outcome.</p></Section>; }
function CompareDimension({ item }) { return <div><p className="text-sm font-extrabold text-slate-900">{item.label}</p>{item.score != null ? <div className="mt-2 space-y-2"><Bar label="You" value={item.score}/><Bar label="Alumni" value={100}/></div> : <div className="mt-2 grid grid-cols-2 gap-3"><Data label="You" value={item.student.display}/><Data label="Alumni" value={item.alumni.display}/></div>}</div>; }
function Bar({ label, value }) { return <div className="grid grid-cols-[60px_1fr_42px] items-center gap-2 text-xs"><span className="font-bold text-slate-600">{label}</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-orange-500" style={{ width: `${value}%` }}/></div><span className="text-right font-black text-slate-700">{value}%</span></div>; }
function InsightList({ title, items = [] }) { if (!items.length) return null; return <div className="mt-5"><p className="text-xs font-extrabold uppercase tracking-wider text-orange-700">{title}</p><ul className="mt-2 space-y-2">{items.map((item) => <li key={item} className="text-sm leading-6 text-slate-700">• {item}</li>)}</ul></div>; }

// ── BookingDialog — fully-featured mentorship booking modal ──────────────────
// Features: Framer Motion animation, Escape/backdrop close, body-scroll-lock,
// Indian phone validation, past-date prevention, no duplicate submit,
// proper aria roles, focus management, loading / error / success states.

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isValidIndianPhone(value) {
  return /^[6-9]\d{9}$/.test(value.replace(/\s/g, ""));
}

function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [active]);
}

function BookingDialog({ alumni, path, onClose }) {
  const topics = alumni.availableTopics || [];
  const firstBtnRef = useRef(null);
  const [form, setForm] = useState({
    topicCategory: topics[0] || "other",
    topicDetails: "",
    phone: "",
    date: "",
    time: "",
    durationMinutes: 30,
  });
  const [st, setSt] = useState({ saving: false, sent: false, error: "" });

  useBodyScrollLock(true);

  // Escape key to close
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape" && !st.saving) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, st.saving]);

  // Auto-focus first interactive element on open
  useEffect(() => { firstBtnRef.current?.focus(); }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const phoneValid = isValidIndianPhone(form.phone);
  const detailsValid = form.topicDetails.trim().length >= 10;
  const canSubmit = !st.saving && !st.sent && detailsValid && form.date && form.time && phoneValid;

  const submit = async () => {
    if (!canSubmit) return;
    setSt({ saving: true, sent: false, error: "" });
    try {
      await createMentorshipRequest({
        alumniId: alumni._id,
        topicCategory: form.topicCategory,
        topicDetails: form.topicDetails,
        phone: form.phone,
        requestedDateTime: `${form.date}T${form.time}`,
        durationMinutes: Number(form.durationMinutes),
        path,
      });
      setSt({ saving: false, sent: true, error: "" });
    } catch (err) {
      setSt({ saving: false, sent: false, error: err.response?.data?.message || "Request could not be sent. Please try again." });
    }
  };

  const initials = alumni.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Request mentorship from ${alumni.name}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* Backdrop */}
      <Motion.div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
        onClick={() => !st.saving && onClose()}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal panel */}
      <Motion.section
        className="relative z-10 w-full max-w-[540px] rounded-2xl bg-white shadow-2xl"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-orange-100 text-base font-black text-orange-700">
              {alumni.avatarUrl ? <img src={alumni.avatarUrl} alt="" className="h-full w-full rounded-full object-cover"/> : initials}
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Mentorship request</p>
              <h2 className="mt-0.5 text-lg font-black text-slate-950">Talk with {alumni.name}</h2>
              {alumni.role && alumni.company && (
                <p className="text-xs text-slate-500">{alumni.role} · {alumni.company}</p>
              )}
            </div>
          </div>
          <button
            ref={firstBtnRef}
            onClick={onClose}
            disabled={st.saving}
            aria-label="Close"
            className="ml-4 grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Success state */}
        {st.sent ? (
          <div className="p-5 sm:p-6">
            <div className="rounded-xl bg-emerald-50 p-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <p className="font-black text-emerald-900">Session requested</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-800">Your request has been sent. You will see the status update inside Newbert once {alumni.name.split(" ")[0]} responds.</p>
              <div className="mt-5 flex gap-3">
                <Link to="/mentorship" className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-800">View my requests →</Link>
                <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50">Close</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-5 sm:p-6">
            {/* Topic */}
            <label className="block text-sm font-bold text-slate-800">
              Topic
              <select value={form.topicCategory} onChange={set("topicCategory")} className="control mt-1.5 w-full capitalize">
                {topics.map((t) => <option key={t} value={t}>{t.replaceAll("-", " ")}</option>)}
                {!topics.length && <option value="other">Other</option>}
              </select>
            </label>

            {/* Question / details */}
            <label className="block text-sm font-bold text-slate-800">
              Your question <span className="font-normal text-slate-500">(minimum 10 characters)</span>
              <textarea
                value={form.topicDetails}
                onChange={set("topicDetails")}
                rows={3}
                placeholder="Briefly share your current situation and what you need guidance on."
                className="control mt-1.5 w-full resize-none"
              />
              {form.topicDetails.length > 0 && !detailsValid && (
                <span className="mt-1 text-xs font-bold text-red-600">Please add at least 10 characters.</span>
              )}
            </label>

            {/* Date + Time */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-800">
                Preferred date
                <input type="date" value={form.date} min={todayIso()} onChange={set("date")} className="control mt-1.5 w-full"/>
              </label>
              <label className="text-sm font-bold text-slate-800">
                Preferred time
                <input type="time" value={form.time} onChange={set("time")} className="control mt-1.5 w-full"/>
              </label>
            </div>

            {/* Duration */}
            <label className="block text-sm font-bold text-slate-800">
              Session duration
              <select value={form.durationMinutes} onChange={set("durationMinutes")} className="control mt-1.5 w-full">
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </label>

            {/* Phone */}
            <label className="block text-sm font-bold text-slate-800">
              Your phone number <span className="font-normal text-slate-500">(Indian mobile, 10 digits)</span>
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="e.g. 9876543210"
                maxLength={10}
                className="control mt-1.5 w-full"
              />
              {form.phone.length > 0 && !phoneValid && (
                <span className="mt-1 text-xs font-bold text-red-600">Enter a valid 10-digit Indian mobile number.</span>
              )}
            </label>

            {/* Error */}
            {st.error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700" role="alert">{st.error}</p>
            )}

            {/* Submit */}
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition-opacity hover:bg-orange-400 disabled:opacity-40"
            >
              {st.saving ? "Sending request…" : "Send mentorship request"}
            </button>
            <p className="text-center text-xs text-slate-500">No session is automatically confirmed. {alumni.name.split(" ")[0]} will accept or decline your request.</p>
          </div>
        )}
      </Motion.section>
    </Motion.div>
  );
}

function Section({ title, children }) { return <section className="surface rounded-2xl border border-slate-200 p-6"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">{title}</p><div className="mt-4">{children}</div></section>; }
function Data({ label, value }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-extrabold capitalize text-slate-950">{value ?? "Unavailable"}</p></div>; }
function Tags({ values = [] }) { return values?.length ? <div className="mt-3 flex flex-wrap gap-2">{values.map((value) => <span key={String(value)} className="rounded-md bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-900">{String(value)}</span>)}</div> : null; }
function Body({ children }) { return children ? <p className="mt-3 text-sm leading-6 text-slate-600">{children}</p> : null; }
function Unavailable({ text }) { return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">{text}</div>; }
function ProfileSkeleton() { return <main className="mx-auto max-w-6xl animate-pulse px-5 py-12"><div className="h-56 rounded-2xl bg-slate-200"/><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]"><div className="h-96 rounded-2xl bg-slate-200"/><div className="h-72 rounded-2xl bg-slate-200"/></div></main>; }
