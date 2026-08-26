import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getSavedJobs } from "../utils/jobApplications";
import API from "../Services/api";
import useAuth from "../hook/useAuth";
import { BRANCH_OPTIONS, TARGET_ROLE_OPTIONS, getSkillSuggestions, normalizeSkillName } from "../data/profileOptions";

// Build a complete year from authenticated, server-synced activity records.
function buildYearlyActivity(year, activityCalendar) {
  const activityByDate = new Map((activityCalendar || []).map((day) => [day.date, day]));
  const days = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const current = new Date(startDate);
  while (current <= endDate) {
    const isFuture = current > today;
    const dateStr = `${year}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    const activity = activityByDate.get(dateStr);
    const github = Number(activity?.github) || 0;
    const leetcode = Number(activity?.leetcode) || 0;
    const total = github + leetcode;

    days.push({
      date: new Date(current),
      dateStr,
      dayOfWeek: current.getDay(), // 0 = Sun, 6 = Sat
      month: current.getMonth(),
      dayOfMonth: current.getDate(),
      github,
      leetcode,
      total,
      isFuture,
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// --- Compute Streaks & Metrics across Year Data ---
function computeYearMetrics(days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalContributions = 0;
  let activeDays = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  days.forEach((d) => {
    totalContributions += d.total;
    if (d.total > 0) {
      activeDays++;
      runningStreak++;
      if (runningStreak > longestStreak) longestStreak = runningStreak;
    } else {
      runningStreak = 0;
    }
  });

  // Compute Current Streak backwards from today
  let currentStreak = 0;
  const pastDays = days
    .filter((d) => d.date <= today)
    .sort((a, b) => b.date - a.date);

  for (let i = 0; i < pastDays.length; i++) {
    const d = pastDays[i];
    if (d.total > 0) {
      currentStreak++;
    } else {
      // Allow today to be incomplete without breaking yesterday's streak
      if (i === 0 && d.date.getTime() === today.getTime()) {
        continue;
      }
      break;
    }
  }

  return { totalContributions, activeDays, currentStreak, longestStreak };
}

// --- Build 52-Week Matrix (Columns = Weeks, Rows = Days Sun-Sat) ---
function buildHeatmapWeeks(days) {
  const weeks = [];
  let currentWeek = [];

  if (days.length > 0) {
    const firstDay = days[0].dayOfWeek; // 0 = Sun
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null); // Empty slot before Jan 1
    }
  }

  days.forEach((d) => {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

const MONTH_SHORT_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const HEATMAP_LEVELS = {
  0: "bg-slate-800/15 dark:bg-slate-800/70",
  1: "bg-emerald-900/45",
  2: "bg-emerald-700/75",
  3: "bg-emerald-500",
  4: "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,.22)]",
};

export default function Profile() {
  const { profile, loading: profileLoading, error: profileError, saveProfile, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savedJobs] = useState(getSavedJobs);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (profileLoading || !profile) return;
    if (!profile.onboardingCompleted) {
      setEditing(true);
      if (location.pathname !== "/complete-profile") navigate("/complete-profile", { replace: true });
    } else if (location.pathname === "/complete-profile") {
      setEditing(false);
      navigate("/profile", { replace: true });
    }
  }, [profileLoading, profile, location.pathname, navigate]);

  const save = async (next) => {
    const saved = await saveProfile(next);
    if (saved.onboardingCompleted) {
      setEditing(false);
      navigate("/profile", { replace: true });
    }
  };

  if (profileLoading) return <ProfileLoading />;
  if (!profile) return <GuestProfile error={profileError} />;
  if (editing)
    return (
      <ProfileSetup
        profile={profile}
        onSave={save}
        syncing={syncing}
        setSyncing={setSyncing}
      />
    );

  return <ProfileDashboard profile={profile} savedJobs={savedJobs} onEdit={() => setEditing(true)} onLogout={() => { logout(); navigate("/", { replace: true }); }} />;
}

function ProfileLoading() { return <main className="profile-page min-h-screen px-5 py-12"><div className="mx-auto max-w-6xl animate-pulse space-y-5"><div className="h-44 rounded-2xl bg-slate-200/70"/><div className="grid gap-6 lg:grid-cols-2"><div className="h-80 rounded-2xl bg-slate-200/70"/><div className="h-80 rounded-2xl bg-slate-200/70"/></div></div></main>; }

function GuestProfile({ error }) {
  return (
    <main className="profile-page min-h-screen px-5 py-12">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow text-orange-600 font-extrabold uppercase tracking-widest text-xs">Your Newbert profile</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-950">Sign in to build your placement signal.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your profile starts with your name and email, then grows through the public accounts and learning activity you choose to connect.
        </p>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <Link to="/" className="mt-7 inline-block rounded-lg bg-orange-500 px-6 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-orange-600">
          Return to Newbert
        </Link>
      </div>
    </main>
  );
}

function CollegeField({ form, update }) {
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => { let active = true; const query = form.college.trim(); if (query.length < 2) { setSuggestions([]); return undefined; } const timer = setTimeout(() => API.get("/colleges/search", { params: { q: query } }).then(({ data }) => { if (active) setSuggestions(data.colleges || []); }).catch(() => { if (active) setSuggestions([]); }), 180); return () => { active = false; clearTimeout(timer); }; }, [form.college]);
  return <label className="relative text-sm font-bold text-slate-800">College *<input value={form.college} onChange={(event) => { update("college", event.target.value); update("collegeId", ""); update("collegeName", ""); }} placeholder="Type your AKTU college" className="control mt-2 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"/>{suggestions.length ? <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">{suggestions.map((college) => <button type="button" key={college.id} onClick={() => { update("college", college.name); update("collegeName", college.name); update("collegeId", college.id); setSuggestions([]); }} className="block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-orange-50"><span className="block text-sm font-bold text-slate-900">{college.name}</span><span className="text-xs text-slate-500">{college.university} · {college.city}</span></button>)}</div> : null}</label>;
}

function ProfileSetup({ profile, onSave, syncing, setSyncing }) {
  const syncControllerRef = useRef(null);
  const [syncErrors, setSyncErrors] = useState(profile.syncErrors || {});
  const [saveError, setSaveError] = useState("");
  const knownBranch = BRANCH_OPTIONS.slice(0, -1).includes(profile.branch);
  const [branchChoice, setBranchChoice] = useState(knownBranch ? profile.branch : profile.branch ? "Other" : "");
  const [customBranch, setCustomBranch] = useState(knownBranch ? "" : profile.branch || "");
  const knownTarget = TARGET_ROLE_OPTIONS.slice(0, -1).includes(profile.targetRole);
  const [targetChoice, setTargetChoice] = useState(knownTarget ? profile.targetRole : profile.targetRole ? "Other" : "");
  const [customTarget, setCustomTarget] = useState(knownTarget ? "" : profile.targetRole || "");
  const [form, setForm] = useState({
    name: profile.name || "",
    email: profile.email || "",
    college: profile.college || "",
    collegeId: profile.collegeId || "",
    collegeName: profile.collegeName || profile.college || "",
    branch: profile.branch || "",
    graduationYear: profile.graduationYear || "",
    targetRole: profile.targetRole || "",
    targetCompany: profile.targetCompany || "",
    bio: profile.bio || "",
    github: profile.github || "",
    leetcode: profile.leetcode || "",
    linkedin: profile.linkedin || "",
    avatar: profile.avatar || "",
    cover: profile.cover || "",
    skills: profile.skills || [],
    projects: profile.projects ?? "",
    cgpa: profile.cgpa ?? "",
  });

  useEffect(() => () => syncControllerRef.current?.abort(), []);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const save = async () => {
    setSaveError("");
    try { await onSave(form); }
    catch (error) { setSaveError(error.response?.data?.message || "Unable to save your profile. Please try again."); }
  };
  const syncProfiles = async () => {
    syncControllerRef.current?.abort();
    const controller = new AbortController();
    syncControllerRef.current = controller;
    const requestedGithub = form.github;
    const requestedLeetcode = form.leetcode;
    setSyncErrors({});
    setSyncing(true);
    try {
      const { data } = await API.post("/profiles/sync", { github: requestedGithub, leetcode: requestedLeetcode }, { signal: controller.signal });
      setForm((current) => current.github === requestedGithub && current.leetcode === requestedLeetcode ? ({ ...current, ...data.profile, skills: data.profile.skills || current.skills }) : current);
      setSyncErrors(data.syncErrors || {});
    } catch (error) {
      if (error.code !== "ERR_CANCELED") setSyncErrors({ [error.response?.data?.source || "general"]: error.response?.data?.message || "Could not sync your public profiles." });
    } finally { if (syncControllerRef.current === controller) setSyncing(false); }
  };
  const canSave = Boolean(form.name.trim() && form.college.trim() && form.branch.trim());

  return (
    <main className="profile-page min-h-screen px-5 py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow text-orange-600 font-extrabold uppercase tracking-widest text-xs">{profile.onboardingCompleted ? "Edit your profile" : "Complete your profile"}</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-950 md:text-4xl">
          Hi, {form.name || "student"}. Let’s make your preparation visible.
        </h1>
        <p className="mt-3 text-sm text-slate-600">These details power your roadmap, courses, job matches, and placement readiness score.</p>

        <section className="surface mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Full name" value={form.name} onChange={(v) => update("name", v)} />
            <Field label="Email" value={form.email} onChange={(v) => update("email", v)} type="email" />
            <CollegeField form={form} update={update}/>
            <label className="text-sm font-bold text-slate-800">Branch *
              <select value={branchChoice} onChange={(event) => { const value = event.target.value; setBranchChoice(value); update("branch", value === "Other" ? customBranch : value); }} className="control mt-2 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none">
                <option value="">Select your branch</option>
                {BRANCH_OPTIONS.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
              </select>
            </label>
            {branchChoice === "Other" && <Field label="Your branch *" value={customBranch} onChange={(value) => { setCustomBranch(value); update("branch", value); }} placeholder="Type your branch" />}
            <Field label="Graduation year (optional)" value={form.graduationYear} onChange={(v) => update("graduationYear", v)} placeholder="2027" type="number" />
            <Field label="Completed projects" value={form.projects} onChange={(v) => update("projects", v)} placeholder="Example: 3" type="number" />
            <Field label="CGPA" value={form.cgpa} onChange={(v) => update("cgpa", v)} placeholder="Example: 8.2" type="number" />
            <label className="text-sm font-bold text-slate-800">Career target (optional)
              <select value={targetChoice} onChange={(event) => { const value = event.target.value; setTargetChoice(value); update("targetRole", value === "Other" ? customTarget : value); }} className="control mt-2 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none">
                <option value="">Choose a career target</option>
                {TARGET_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            {targetChoice === "Other" && <Field label="Your career target" value={customTarget} onChange={(value) => { setCustomTarget(value); update("targetRole", value); }} placeholder="Example: Product Design" />}
            <Field label="Target company (optional)" value={form.targetCompany} onChange={(v) => update("targetCompany", v)} placeholder="Example: Siemens" />
            <label className="text-sm font-bold text-slate-800 md:col-span-2">
              Short bio
              <textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} className="control mt-2 min-h-24 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none" placeholder="Target role, strongest project, and what you are currently learning..." />
            </label>
          </div>
          <SkillInput skills={form.skills} branch={form.branch} targetRole={form.targetRole} onChange={(skills) => update("skills", skills)} />
        </section>

        <section className="surface mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-extrabold text-slate-950">Connect public profiles <span className="font-semibold text-slate-500">(optional)</span></p>
          <p className="mt-1 text-sm text-slate-600">Skip this section if you do not use these platforms. Newbert only calls an external service after you provide its username and choose sync.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="GitHub username or link (optional)" value={form.github} onChange={(v) => update("github", v)} placeholder="https://github.com/username" />
            <Field label="LeetCode username or link (optional)" value={form.leetcode} onChange={(v) => update("leetcode", v)} placeholder="https://leetcode.com/u/username" />
            <Field label="LinkedIn profile (optional)" value={form.linkedin} onChange={(v) => update("linkedin", v)} placeholder="https://linkedin.com/in/username" />
            <Field label="Profile image URL" value={form.avatar} onChange={(v) => update("avatar", v)} placeholder="Optional image URL" />
            <Field label="Cover image URL" value={form.cover} onChange={(v) => update("cover", v)} placeholder="Optional cover image URL" />
          </div>
          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <button onClick={syncProfiles} disabled={(!form.github && !form.leetcode) || syncing} className={`rounded-lg px-4 py-2.5 text-sm font-extrabold shadow-sm transition ${(form.github || form.leetcode) && !syncing ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-slate-100 text-slate-400"}`}>
              {syncing ? "Syncing GitHub and LeetCode..." : "Sync public profiles"}
            </button>
            <span className="text-xs font-semibold text-slate-500">No account is required to finish your profile.</span>
          </div>
          {syncing && <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">{form.github && <p className="rounded-lg bg-slate-100 px-3 py-2">Syncing GitHub activity...</p>}{form.leetcode && <p className="rounded-lg bg-slate-100 px-3 py-2">Syncing LeetCode profile...</p>}</div>}
          {(syncErrors.github || syncErrors.leetcode || syncErrors.general) && <div className="mt-4 space-y-2">{syncErrors.github && <SyncMessage label="GitHub" message={syncErrors.github}/>} {syncErrors.leetcode && <SyncMessage label="LeetCode" message={syncErrors.leetcode}/>} {syncErrors.general && <SyncMessage label="Sync" message={syncErrors.general}/>}</div>}
        </section>

        {saveError && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{saveError}</p>}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button onClick={save} disabled={!canSave} className={`w-full rounded-lg px-5 py-3 text-sm font-extrabold text-white shadow-md transition sm:w-auto ${canSave ? "bg-orange-500 hover:bg-orange-600" : "bg-slate-300 text-slate-500 cursor-not-allowed"}`}>{profile.onboardingCompleted ? "Save profile" : "Open my placement dashboard"}</button>
          {!form.github && !form.leetcode && !form.linkedin && <button onClick={save} disabled={!canSave} className="text-sm font-extrabold text-orange-700 disabled:text-slate-400">Skip account connections for now →</button>}
        </div>
      </div>
    </main>
  );
}

function SkillInput({ skills, branch, targetRole, onChange }) {
  const [query, setQuery] = useState("");
  const skillNames = skills.map((skill) => skill.name || skill);
  const existing = new Set(skillNames.map((name) => String(name).trim().toLowerCase()));
  const suggestions = getSkillSuggestions(branch, targetRole)
    .filter((name) => !existing.has(name.toLowerCase()) && (!query.trim() || name.toLowerCase().includes(query.trim().toLowerCase())))
    .slice(0, 8);

  const add = (value) => {
    const name = normalizeSkillName(value);
    if (!name || existing.has(name.toLowerCase())) { setQuery(""); return; }
    onChange([...skills, { name, score: 0, source: "manual" }]);
    setQuery("");
  };
  const remove = (name) => onChange(skills.filter((skill) => (skill.name || skill).toLowerCase() !== name.toLowerCase()));

  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <p className="text-sm font-extrabold text-slate-950">Your skills <span className="font-semibold text-slate-500">(optional)</span></p>
      <p className="mt-1 text-xs leading-5 text-slate-500">Search suggestions or type any custom academic, technical, design, or career skill.</p>
      {skillNames.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{skillNames.map((name) => <span key={name} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-extrabold text-orange-950">{name}<button type="button" onClick={() => remove(name)} aria-label={`Remove ${name}`} className="text-orange-500 hover:text-red-600">×</button></span>)}</div>}
      <div className="mt-3 flex gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); add(query); } }} className="control min-w-0 flex-1 rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none" placeholder="Type a skill and press Enter" />
        <button type="button" onClick={() => add(query)} disabled={!query.trim()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-extrabold text-white disabled:bg-slate-300">Add</button>
      </div>
      {suggestions.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{suggestions.map((name) => <button key={name} type="button" onClick={() => add(name)} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-orange-300 hover:text-orange-700">+ {name}</button>)}</div>}
    </div>
  );
}

function ProfileDashboard({ profile, savedJobs, onEdit, onLogout }) {
  const skills = (profile.skills || []).map((skill) => skill.name || skill);
  const ratedSkills = (profile.skills || []).map((skill) => ({ name: skill.name || skill, score: skill.score ?? 0 })).filter((skill) => skill.score > 0);
  const [seniorMatch, setSeniorMatch] = useState({ loading: true, match: null, closest: [], benchmark: null, reason: "", error: "" });

  useEffect(() => {
    const controller = new AbortController();
    setSeniorMatch({ loading: true, match: null, closest: [], benchmark: null, reason: "", error: "" });
    API.get("/alumni/closest?limit=3", { signal: controller.signal }).then(({ data }) => {
      const closest = data.closest || [];
      const first = closest[0];
      const match = first ? { ...first.match, matchedSkills: first.matchedSkills || [], missingSkills: (first.missingSkills || []).map((item) => item.skill), senior: { id: first.alumni._id, name: first.alumni.name, company: first.alumni.placement?.company || first.alumni.company, role: first.alumni.placement?.role || first.alumni.role, package: first.alumni.placement?.packageLpa ?? first.alumni.package, college: first.alumni.college } } : null;
      setSeniorMatch({ loading: false, match, closest, benchmark: data.benchmark || null, reason: "", error: "" });
    }).catch((error) => {
      if (error.code !== "ERR_CANCELED") setSeniorMatch({ loading: false, match: null, closest: [], benchmark: null, reason: "", error: error.response?.data?.message || "Unable to calculate your senior match." });
    });
    return () => controller.abort();
  }, [profile.college, profile.lastSyncedAt]);
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="profile-page min-h-screen px-5 py-10 md:py-14">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Profile Hero Header */}
        <section className="profile-hero overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-28 bg-[#2c1c18] bg-cover bg-center" style={profile.cover ? { backgroundImage: `url(${profile.cover})` } : undefined} />
          <div className="px-5 pb-6 md:px-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="flex items-end gap-4">
                <div className="-mt-10 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-orange-500 text-xl font-extrabold text-white shadow-md">
                  {profile.avatar ? <img src={profile.avatar} alt="Profile" className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="pt-3">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Career pulse · {profile.branch || "AKTU student"}</p>
                  <h1 className="mt-1 text-2xl font-extrabold text-slate-950">{profile.name}</h1>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {profile.college}{profile.graduationYear ? ` · Class of ${profile.graduationYear}` : ""}{profile.targetRole ? ` · ${profile.targetRole}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2"><button onClick={onEdit} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:border-orange-500 hover:text-orange-600">Edit profile</button><button onClick={onLogout} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-extrabold text-red-700 transition hover:border-red-500">Log out</button></div>
            </div>
            {profile.bio && <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{profile.bio}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.githubStats && <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-950">✓ GitHub synced</span>}
              {profile.leetcodeStats && <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-950">✓ LeetCode synced</span>}
              {profile.linkedin && <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-950">✓ LinkedIn connected</span>}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ConnectionCard platform="GitHub" connection={profile.connections?.github} username={profile.githubUsername} stats={profile.githubStats ? `${profile.githubStats.publicRepos} public repos` : ""} onEdit={onEdit} />
              <ConnectionCard platform="LeetCode" connection={profile.connections?.leetcode} username={profile.leetcodeUsername} stats={profile.leetcodeStats ? `${profile.leetcodeStats.totalSolved} solved` : ""} onEdit={onEdit} />
              <ConnectionCard platform="LinkedIn" connection={profile.connections?.linkedin} username="" stats={profile.linkedin ? "Profile added" : ""} onEdit={onEdit} />
            </div>
            <p className="mt-4 text-xs font-bold text-slate-500">Profile strength: <span className="text-orange-700">{profile.profileStrength ?? 0}%</span> · Optional accounts improve strength but never block access.</p>
          </div>
        </section>

        {/* Senior match + verified activity */}
        <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <SeniorMatchCard state={seniorMatch} />

          <StreakCalendarHeatmap activityCalendar={profile.activityCalendar || []} lastSyncedAt={profile.lastSyncedAt} syncedCurrentStreak={profile.currentStreak} syncedLongestStreak={profile.longestStreak} />
        </section>

        <PeerBenchmark benchmark={seniorMatch.benchmark} />

        {/* Skill Breakdown & Bookmarked Roles */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="surface rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Skill signal</p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-950">Strengths you can show today</h2>
              </div>
              <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Sync data</p>
            </div>
            <div className="mt-6 grid gap-x-7 gap-y-4 sm:grid-cols-2">
              {ratedSkills.map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-800">{skill.name}</span>
                    <span className="font-extrabold text-orange-600">{skill.score}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div style={{ width: `${skill.score}%` }} className="h-full rounded-full bg-orange-500" />
                  </div>
                </div>
              ))}
              {!ratedSkills.length && <p className="text-sm leading-6 text-slate-500 sm:col-span-2">No verified skill scores yet. Sync GitHub or LeetCode from Edit profile.</p>}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill} className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-950">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <BookmarkedJobs jobs={savedJobs} />
        </section>
      </div>
    </main>
  );
}

function ConnectionCard({ platform, connection, username, stats, onEdit }) {
  if (!connection?.connected) return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{platform}</p><p className="mt-1 text-sm font-extrabold text-slate-900">Not connected</p><button onClick={onEdit} className="mt-2 text-xs font-extrabold text-orange-700">Add profile →</button></div>;
  return <div className={`rounded-lg border p-3 ${connection.error ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}><p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">{platform}</p><p className="mt-1 text-sm font-extrabold text-slate-950">{username ? `@${username}` : "Connected"}</p><p className="mt-1 text-xs font-semibold text-slate-600">{connection.error || stats || (connection.synced ? "Connected" : "Saved · sync optional")}</p>{connection.error && <button onClick={onEdit} className="mt-2 text-xs font-extrabold text-orange-700">Check profile →</button>}</div>;
}

function SyncMessage({ label, message }) { return <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"><strong>{label}:</strong> {message}</p>; }

function SeniorMatchCard({ state }) {
  if (state.loading) return <div className="surface rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Senior match</p><div className="mt-5 animate-pulse space-y-3"><div className="h-8 w-3/4 rounded bg-slate-200"/><div className="h-4 w-1/2 rounded bg-slate-200"/><div className="h-20 rounded bg-slate-100"/><div className="h-10 rounded bg-slate-200"/></div><p className="mt-4 text-sm font-semibold text-slate-500">Finding your closest senior match...</p></div>;
  if (!state.match) return <div className="surface flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Senior match</p><h2 className="mt-4 text-xl font-extrabold text-slate-950">No verified senior match available yet.</h2><p className="mt-3 text-sm leading-6 text-slate-600">{state.error || state.reason || "We're adding more alumni from your college."}</p><Link to="/alumni-wall" className="mt-auto pt-8 text-sm font-extrabold text-orange-600 hover:text-orange-700">Browse verified alumni →</Link></div>;
  const { score, matchedSkills, missingSkills, senior } = state.match;
  return <div className="surface flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Closest senior to your profile</p><p className="mt-2 text-sm text-slate-600">You match <strong className="text-slate-950">{score}%</strong> with</p><h2 className="mt-1 text-2xl font-extrabold text-slate-950">{senior.name}</h2></div><span className="text-4xl font-black text-orange-500">{score}%</span></div><p className="mt-3 text-sm font-bold text-slate-700">{senior.company}{senior.package != null ? ` · ${senior.package} LPA` : ""}</p><p className="mt-1 text-xs text-slate-500">{senior.role} · Senior from {senior.college}</p><div className="mt-6"><p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Matched skills</p><div className="mt-2 flex flex-wrap gap-2">{matchedSkills.length ? matchedSkills.map((skill) => <span key={skill} className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">✓ {skill}</span>) : <span className="text-xs text-slate-500">No shared skills yet</span>}</div></div><div className="mt-5"><p className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600">Main differences</p><div className="mt-2 flex flex-wrap gap-2">{missingSkills.length ? missingSkills.map((skill) => <span key={skill} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">+ {skill}</span>) : <span className="text-xs font-semibold text-emerald-700">All listed senior skills matched</span>}</div></div>{state.closest?.length > 1 && <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Closest seniors</p><div className="mt-2 flex flex-wrap gap-2">{state.closest.slice(0, 3).map((item) => <Link key={item.alumni._id} to={`/alumni-wall/${item.alumni._id}`} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{item.alumni.name.split(" ")[0]} · {item.match.overallScore}%</Link>)}</div></div>}<div className="mt-7 flex gap-3"><Link to={`/alumni-wall/${senior.id}`} className="inline-flex w-fit rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-extrabold text-[#171918] hover:bg-orange-400">View Senior</Link><Link to="/alumni-wall" className="inline-flex w-fit rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-extrabold text-slate-700">Compare journey</Link></div></div>;
}

function PeerBenchmark({ benchmark }) {
  if (!benchmark) return null;
  return <section className="surface rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Peer benchmark</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">Your shortest path forward</h2><p className="mt-2 text-sm text-slate-600">Based on {benchmark.cohortSize} closest verified alumni profiles, not every outcome in Newbert.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><BenchmarkStat label="Average DSA" value={benchmark.averages.dsa ?? "Unavailable"}/><BenchmarkStat label="Average projects" value={benchmark.averages.projects ?? "Unavailable"}/><BenchmarkStat label="Had internship" value={`${benchmark.averages.internshipRate ?? 0}%`}/></div>{benchmark.commonSkills?.length ? <div className="mt-5 flex flex-wrap gap-2">{benchmark.commonSkills.map((item) => <span key={item.skill} className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-900">{item.skill} · {item.percent}%</span>)}</div> : null}{benchmark.insights?.length ? <ul className="mt-5 space-y-1 text-sm leading-6 text-slate-700">{benchmark.insights.map((insight) => <li key={insight}>• {insight}</li>)}</ul> : null}</section>;
}
function BenchmarkStat({ label, value }) { return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-lg font-extrabold text-slate-950">{value}</p></div>; }

// --- GitHub/LeetCode Style Heatmap Calendar & Streak Dashboard ---
function StreakCalendarHeatmap({ activityCalendar, lastSyncedAt, syncedCurrentStreak, syncedLongestStreak }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [hoveredDay, setHoveredDay] = useState(null);

  const daysData = useMemo(() => buildYearlyActivity(selectedYear, activityCalendar), [selectedYear, activityCalendar]);
  const metrics = useMemo(() => computeYearMetrics(daysData), [daysData]);
  const weeks = useMemo(() => buildHeatmapWeeks(daysData), [daysData]);

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  // Map month label positions to week column indices
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIdx) => {
      const validDay = week.find((d) => d !== null);
      if (validDay && validDay.month !== lastMonth) {
        labels.push({ monthName: MONTH_SHORT_NAMES[validDay.month], weekIdx });
        lastMonth = validDay.month;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="surface rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Momentum</p>
          <h2 className="mt-0.5 text-xl font-extrabold text-slate-950 flex items-center gap-2">
            <span>{metrics.totalContributions.toLocaleString()} verified activities</span>
            <span className="text-xs font-bold text-slate-500">in {selectedYear}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="control rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-900 focus:border-orange-500 focus:outline-none">
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Streak Metric Cards — High Contrast Fix */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StreakMetricCard label={selectedYear === currentYear ? "Current Streak" : "Year-end Streak"} value={`${selectedYear === currentYear ? (syncedCurrentStreak || 0) : metrics.currentStreak} ${(selectedYear === currentYear ? (syncedCurrentStreak || 0) : metrics.currentStreak) === 1 ? "day" : "days"}`} icon="⚡" subtitle={selectedYear === currentYear ? "Across both platforms" : `End of ${selectedYear}`} />
        <StreakMetricCard label="Longest Streak" value={`${syncedLongestStreak || 0} ${(syncedLongestStreak || 0) === 1 ? "day" : "days"}`} icon="🏆" subtitle="Best run in synced history" />
        <StreakMetricCard label="Active Days" value={`${metrics.activeDays} days`} icon="📅" subtitle={`${Math.round((metrics.activeDays / daysData.length) * 100)}% of year`} />
      </div>

      <p className={`mt-4 rounded-lg border px-3 py-2 text-xs font-semibold ${activityCalendar.length ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        {activityCalendar.length ? `Verified from synced GitHub and LeetCode activity${lastSyncedAt ? ` · updated ${new Date(lastSyncedAt).toLocaleString()}` : ""}. A green day means at least one platform recorded activity.` : "No verified activity yet. Edit your profile, add GitHub or LeetCode, and sync your public profiles."}
      </p>

      {/* GitHub / LeetCode Heatmap Grid Container */}
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="min-w-[830px]">
          {/* Month Headers */}
          <div className="relative mb-2 h-4 text-[11px] font-extrabold text-slate-500">
            {monthLabels.map((m, idx) => (
              <span key={`${m.monthName}-${idx}`} className="absolute" style={{ left: `${m.weekIdx * 15 + 34}px` }}>
                {m.monthName}
              </span>
            ))}
          </div>

          {/* Heatmap Grid Body */}
          <div className="flex gap-2">
            {/* Weekday Row Labels (Sun - Sat) */}
            <div className="grid w-7 shrink-0 grid-rows-7 gap-[3px] text-[9px] font-bold leading-3 text-slate-400 select-none">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* 52 Week Columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, weekIdx) => (
                <div key={`week-${weekIdx}`} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIdx) => {
                    if (!day) {
                      return <div key={`empty-${weekIdx}-${dayIdx}`} className="h-3 w-3 rounded-[3px] bg-transparent" />;
                    }

                    // Intensity score (0..4)
                    let level = 0;
                    if (day.total >= 10) level = 4;
                    else if (day.total >= 6) level = 3;
                    else if (day.total >= 3) level = 2;
                    else if (day.total >= 1) level = 1;

                    return (
                      <div
                        key={day.dateStr}
                        onMouseEnter={(event) => setHoveredDay({ day, x: Math.min(event.clientX + 14, window.innerWidth - 230), y: Math.max(12, event.clientY - 150) })}
                        onMouseMove={(event) => setHoveredDay((current) => current ? { ...current, x: Math.min(event.clientX + 14, window.innerWidth - 230), y: Math.max(12, event.clientY - 150) } : current)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`h-3 w-3 rounded-[3px] transition duration-150 ${day.isFuture ? "cursor-default bg-slate-800/5 opacity-40" : `cursor-pointer hover:ring-2 hover:ring-emerald-300/40 hover:ring-offset-1 ${HEATMAP_LEVELS[level]}`}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {hoveredDay && <ActivityTooltip {...hoveredDay} />}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-400">Hover over a day to view its verified activity</span>

        {/* Intensity Legend */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <span key={lvl} className={`h-3 w-3 rounded-[3px] ${HEATMAP_LEVELS[lvl]}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function ActivityTooltip({ day, x, y }) {
  return <div className="pointer-events-none fixed z-[100] w-52 rounded-lg border border-slate-700 bg-[#101827] p-3 text-left shadow-2xl" style={{ left: x, top: y }}><p className="text-xs font-extrabold text-white">{day.date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>{day.total > 0 ? <div className="mt-3 space-y-2">{day.github > 0 && <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">GitHub</p><p className="text-xs font-semibold text-slate-200">{day.github} {day.github === 1 ? "contribution" : "contributions"}</p></div>}{day.leetcode > 0 && <div><p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">LeetCode</p><p className="text-xs font-semibold text-slate-200">{day.leetcode} {day.leetcode === 1 ? "submission" : "submissions"}</p></div>}<div className="border-t border-slate-700 pt-2"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total activity</p><p className="text-sm font-extrabold text-white">{day.total}</p></div></div> : <p className="mt-2 text-xs font-semibold text-slate-400">No activity</p>}</div>;
}

// --- High-Contrast Metric Card Component ---
function StreakMetricCard({ label, value, icon, subtitle }) {
  return (
    <div className="rounded-xl border border-orange-200/80 bg-orange-50/70 p-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-orange-950">{label}</p>
        <span className="text-sm">{icon}</span>
      </div>
      <p className="mt-1.5 text-xl font-black text-slate-950 leading-tight">{value}</p>
      {subtitle && <p className="mt-0.5 text-[11px] font-semibold text-slate-600">{subtitle}</p>}
    </div>
  );
}

function BookmarkedJobs({ jobs }) {
  return (
    <aside className="surface rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Job tracker</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-950">Bookmarked roles</h2>
        </div>
        <Link to="/jobs" className="text-sm font-extrabold text-orange-600 hover:text-orange-700">
          Explore jobs →
        </Link>
      </div>

      {jobs.length ? (
        <div className="mt-6 space-y-3">
          {jobs.slice(0, 3).map((job) => (
            <article key={job.title} className="rounded-xl border-l-4 border-orange-500 border-slate-200 border bg-orange-50/50 p-4 shadow-2xs">
              <p className="font-extrabold text-slate-950">{job.title}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {job.company} · <span className="font-extrabold text-orange-600">{job.fit}% fit</span>
              </p>
              <p className="mt-2 text-xs font-extrabold text-orange-950">{job.status}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center">
          <p className="font-bold text-slate-900">No bookmarked roles yet.</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Save a job match and it will appear here with its application status.</p>
        </div>
      )}
    </aside>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="text-sm font-bold text-slate-800">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        className="control mt-2 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
        placeholder={placeholder}
      />
    </label>
  );
}
