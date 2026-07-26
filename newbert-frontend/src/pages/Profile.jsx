import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getSavedJobs } from "../utils/jobApplications";

const detectedSkills = ["JavaScript", "React", "Node.js", "Git", "DSA", "SQL"];
const skillScores = [
  { name: "JavaScript", score: 78 },
  { name: "React", score: 72 },
  { name: "DSA", score: 58 },
  { name: "Git", score: 66 },
  { name: "SQL", score: 52 },
  { name: "Projects", score: 64 },
];
const companies = {
  "TCS Digital": ["JavaScript", "React", "DSA", "SQL"],
  "Infosys SP": ["Java", "SQL", "DSA", "Spring Boot"],
  "Wipro Elite": ["React", "DSA", "SQL", "Git"],
};

// --- Seeded Random Generator for Stable Demo Data ---
function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

// --- Generate Full 365-Day Contribution Data for GitHub Heatmap Grid ---
function generateYearlyActivity(year) {
  const days = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const rand = seededRandom(year * 9999 + 42);

  const current = new Date(startDate);
  while (current <= endDate) {
    const isFuture = current > today;
    // Generate realistic contribution density
    const hasActivity = !isFuture && rand() > 0.35;
    const github = hasActivity ? Math.floor(rand() * 6) + 1 : 0;
    const leetcode = hasActivity && rand() > 0.4 ? Math.floor(rand() * 5) + 1 : 0;
    const total = github + leetcode;

    days.push({
      date: new Date(current),
      dateStr: current.toISOString().split("T")[0],
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

// --- Intensity Level Theme Palettes ---
const HEATMAP_THEMES = {
  orange: {
    0: "bg-slate-100 border-slate-200/60",
    1: "bg-orange-200 border-orange-300",
    2: "bg-orange-400 border-orange-500",
    3: "bg-orange-500 border-orange-600",
    4: "bg-orange-600 border-orange-700 shadow-sm shadow-orange-500/40",
  },
  emerald: {
    0: "bg-slate-100 border-slate-200/60",
    1: "bg-emerald-200 border-emerald-300",
    2: "bg-emerald-400 border-emerald-500",
    3: "bg-emerald-500 border-emerald-600",
    4: "bg-emerald-700 border-emerald-800 shadow-sm shadow-emerald-500/40",
  },
  fire: {
    0: "bg-slate-100 border-slate-200/60",
    1: "bg-amber-200 border-amber-300",
    2: "bg-amber-400 border-amber-500",
    3: "bg-orange-500 border-orange-600",
    4: "bg-red-600 border-red-700 shadow-sm shadow-red-500/40",
  },
};

export default function Profile() {
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem("newbert-profile") || "null"));
  const [editing, setEditing] = useState(!profile?.github);
  const [syncing, setSyncing] = useState(false);
  const [savedJobs] = useState(getSavedJobs);

  const save = (next) => {
    localStorage.setItem("newbert-profile", JSON.stringify(next));
    setProfile(next);
  };

  if (!profile) return <GuestProfile />;
  if (editing)
    return (
      <ProfileSetup
        profile={profile}
        onSave={(next) => {
          save(next);
          setEditing(false);
        }}
        syncing={syncing}
        setSyncing={setSyncing}
      />
    );

  return <ProfileDashboard profile={profile} savedJobs={savedJobs} onEdit={() => setEditing(true)} />;
}

function GuestProfile() {
  return (
    <main className="profile-page min-h-screen px-5 py-12">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow text-orange-600 font-extrabold uppercase tracking-widest text-xs">Your Newbert profile</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-950">Sign in to build your placement signal.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your profile starts with your name and email, then grows through the public accounts and learning activity you choose to connect.
        </p>
        <Link to="/" className="mt-7 inline-block rounded-lg bg-orange-500 px-6 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-orange-600">
          Return to Newbert
        </Link>
      </div>
    </main>
  );
}

function ProfileSetup({ profile, onSave, syncing, setSyncing }) {
  const [form, setForm] = useState({
    name: profile.name || "",
    email: profile.email || "",
    college: profile.college || "",
    branch: profile.branch || "",
    graduationYear: profile.graduationYear || "2026",
    targetCompany: profile.targetCompany || "TCS Digital",
    bio: profile.bio || "",
    github: profile.github || "",
    leetcode: profile.leetcode || "",
    linkedin: profile.linkedin || "",
    avatar: profile.avatar || "",
    cover: profile.cover || "",
    skills: profile.skills || [],
  });

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const syncProfiles = () => {
    setSyncing(true);
    window.setTimeout(() => {
      update("skills", detectedSkills);
      setSyncing(false);
    }, 700);
  };
  const canSave = form.name.trim() && form.college.trim() && form.github.trim() && form.leetcode.trim();

  return (
    <main className="profile-page min-h-screen px-5 py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow text-orange-600 font-extrabold uppercase tracking-widest text-xs">Complete your profile</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-950 md:text-4xl">
          Hi, {form.name || "student"}. Let’s make your preparation visible.
        </h1>
        <p className="mt-3 text-sm text-slate-600">These details power your roadmap, courses, job matches, and placement readiness score.</p>

        <section className="surface mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Full name" value={form.name} onChange={(v) => update("name", v)} />
            <Field label="Email" value={form.email} onChange={(v) => update("email", v)} type="email" />
            <Field label="College" value={form.college} onChange={(v) => update("college", v)} placeholder="Example: AKTU Lucknow" />
            <Field label="Branch" value={form.branch} onChange={(v) => update("branch", v)} placeholder="Example: Information Technology" />
            <Field label="Graduation year" value={form.graduationYear} onChange={(v) => update("graduationYear", v)} placeholder="2026" />
            <label className="text-sm font-bold text-slate-800">
              Target company
              <select value={form.targetCompany} onChange={(e) => update("targetCompany", e.target.value)} className="control mt-2 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none">
                {Object.keys(companies).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-slate-800 md:col-span-2">
              Short bio
              <textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} className="control mt-2 min-h-24 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none" placeholder="Target role, strongest project, and what you are currently learning..." />
            </label>
          </div>
        </section>

        <section className="surface mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-extrabold text-slate-950">Connect your public profile links</p>
          <p className="mt-1 text-sm text-slate-600">Newbert will sync these accounts with your permission. Demo activity is populated below.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="GitHub link" value={form.github} onChange={(v) => update("github", v)} placeholder="https://github.com/username" />
            <Field label="LeetCode link" value={form.leetcode} onChange={(v) => update("leetcode", v)} placeholder="https://leetcode.com/username" />
            <Field label="LinkedIn link" value={form.linkedin} onChange={(v) => update("linkedin", v)} placeholder="https://linkedin.com/in/username" />
            <Field label="Profile image URL" value={form.avatar} onChange={(v) => update("avatar", v)} placeholder="Optional image URL" />
            <Field label="Cover image URL" value={form.cover} onChange={(v) => update("cover", v)} placeholder="Optional cover image URL" />
          </div>
          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <button onClick={syncProfiles} disabled={!form.github || !form.leetcode || syncing} className={`rounded-lg px-4 py-2.5 text-sm font-extrabold shadow-sm transition ${form.github && form.leetcode && !syncing ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-slate-100 text-slate-400"}`}>
              {syncing ? "Reading public profiles..." : "Detect skills from profiles"}
            </button>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.skills.map((skill) => (
                  <span key={skill} className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-950">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <button onClick={() => onSave(form)} disabled={!canSave} className={`mt-6 w-full rounded-lg px-5 py-3 text-sm font-extrabold text-white shadow-md transition sm:w-auto ${canSave ? "bg-orange-500 hover:bg-orange-600" : "bg-slate-300 text-slate-500 cursor-not-allowed"}`}>
          Open my placement dashboard
        </button>
      </div>
    </main>
  );
}

function ProfileDashboard({ profile, savedJobs, onEdit }) {
  const [company, setCompany] = useState(profile.targetCompany || "TCS Digital");
  const skills = profile.skills?.length ? profile.skills : detectedSkills;
  const requirements = companies[company] || [];
  const skillMatch = requirements.filter((skill) => skills.includes(skill)).length;
  const readiness = Math.min(94, 45 + skillMatch * 10 + 7);
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
                    {profile.college} · Class of {profile.graduationYear}
                  </p>
                </div>
              </div>
              <button onClick={onEdit} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:border-orange-500 hover:text-orange-600">
                Edit profile
              </button>
            </div>
            {profile.bio && <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{profile.bio}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {["GitHub", "LeetCode", "LinkedIn"].map((label) => (
                <span key={label} className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-950">
                  ✓ {label} connected
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Readiness + GitHub Heatmap Streak Section */}
        <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <div className="surface flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Placement readiness</p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-950">Signal for {company}</h2>
                </div>
                <p className="text-4xl font-black text-orange-500">{readiness}%</p>
              </div>

              <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Target company
                <select value={company} onChange={(e) => setCompany(e.target.value)} className="control mt-2 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:border-orange-500 focus:outline-none">
                  {Object.keys(companies).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div style={{ width: `${readiness}%` }} className="h-full rounded-full bg-orange-500 transition-all duration-500" />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                <strong className="text-slate-950">{skillMatch} of {requirements.length}</strong> required signals matched in your connected profiles.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {requirements.map((skill) => {
                const matched = skills.includes(skill);
                return (
                  <span key={skill} className={`rounded-md px-2.5 py-1 text-xs font-extrabold ${matched ? "border border-orange-200 bg-orange-50 text-orange-950" : "bg-slate-100 text-slate-600"}`}>
                    {matched ? "✓ Matched: " : "+ Build: "}
                    {skill}
                  </span>
                );
              })}
            </div>
          </div>

          <StreakCalendarHeatmap />
        </section>

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
              {skillScores.map((skill) => (
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

// --- GitHub/LeetCode Style Heatmap Calendar & Streak Dashboard ---
function StreakCalendarHeatmap() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [theme, setTheme] = useState("orange"); // 'orange' | 'emerald' | 'fire'
  const [hoveredDay, setHoveredDay] = useState(null);

  // Generate full 365 days of data for the selected year
  const daysData = useMemo(() => generateYearlyActivity(selectedYear), [selectedYear]);
  const metrics = useMemo(() => computeYearMetrics(daysData), [daysData]);
  const weeks = useMemo(() => buildHeatmapWeeks(daysData), [daysData]);

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const activePalette = HEATMAP_THEMES[theme];

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
            <span>🔥 {metrics.totalContributions.toLocaleString()} contributions</span>
            <span className="text-xs font-bold text-slate-500">in {selectedYear}</span>
          </h2>
        </div>

        {/* Controls: Year Selector & Theme Switcher */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button type="button" title="Orange Theme" onClick={() => setTheme("orange")} className={`h-5 w-5 rounded-full bg-orange-500 border ${theme === "orange" ? "ring-2 ring-orange-500 ring-offset-1" : "opacity-60"}`} />
            <button type="button" title="GitHub Emerald" onClick={() => setTheme("emerald")} className={`ml-1 h-5 w-5 rounded-full bg-emerald-500 border ${theme === "emerald" ? "ring-2 ring-emerald-500 ring-offset-1" : "opacity-60"}`} />
            <button type="button" title="LeetCode Fire" onClick={() => setTheme("fire")} className={`ml-1 h-5 w-5 rounded-full bg-red-500 border ${theme === "fire" ? "ring-2 ring-red-500 ring-offset-1" : "opacity-60"}`} />
          </div>

          {/* Year Dropdown */}
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
        <StreakMetricCard label="Current Streak" value={`${metrics.currentStreak} ${metrics.currentStreak === 1 ? "day" : "days"}`} icon="⚡" subtitle="Keep it going!" />
        <StreakMetricCard label="Longest Streak" value={`${metrics.longestStreak} ${metrics.longestStreak === 1 ? "day" : "days"}`} icon="🏆" subtitle="Best run this year" />
        <StreakMetricCard label="Active Days" value={`${metrics.activeDays} days`} icon="📅" subtitle={`${Math.round((metrics.activeDays / 365) * 100)}% of year`} />
      </div>

      {/* GitHub / LeetCode Heatmap Grid Container */}
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="min-w-[690px]">
          {/* Month Headers */}
          <div className="relative mb-2 h-4 text-[11px] font-extrabold text-slate-500">
            {monthLabels.map((m, idx) => (
              <span key={`${m.monthName}-${idx}`} className="absolute" style={{ left: `${m.weekIdx * 13 + 28}px` }}>
                {m.monthName}
              </span>
            ))}
          </div>

          {/* Heatmap Grid Body */}
          <div className="flex gap-1">
            {/* Weekday Row Labels (Sun - Sat) */}
            <div className="flex flex-col justify-between py-[1px] text-[10px] font-extrabold text-slate-400 pr-1.5 w-6 select-none">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* 52 Week Columns */}
            <div className="flex gap-1">
              {weeks.map((week, weekIdx) => (
                <div key={`week-${weekIdx}`} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => {
                    if (!day) {
                      return <div key={`empty-${weekIdx}-${dayIdx}`} className="h-2.5 w-2.5 rounded-[2px] bg-transparent" />;
                    }

                    // Intensity score (0..4)
                    let level = 0;
                    if (day.total >= 8) level = 4;
                    else if (day.total >= 5) level = 3;
                    else if (day.total >= 2) level = 2;
                    else if (day.total >= 1) level = 1;

                    const colorClass = activePalette[level];

                    return (
                      <div
                        key={day.dateStr}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`h-2.5 w-2.5 rounded-[2px] border transition-transform hover:scale-125 cursor-pointer ${colorClass}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Tooltip details & Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
        {/* Dynamic Tooltip on Hover */}
        <div className="min-h-5 text-slate-700 font-medium">
          {hoveredDay ? (
            <span>
              <strong className="font-extrabold text-slate-950">
                {hoveredDay.total} {hoveredDay.total === 1 ? "contribution" : "contributions"}
              </strong>{" "}
              on {hoveredDay.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              {hoveredDay.total > 0 && <span className="ml-1 text-slate-500">({hoveredDay.github} GitHub, {hoveredDay.leetcode} LeetCode)</span>}
            </span>
          ) : (
            <span className="text-slate-400">Hover over any day tile to view activity breakdown</span>
          )}
        </div>

        {/* Intensity Legend */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <span key={lvl} className={`h-2.5 w-2.5 rounded-[2px] border ${activePalette[lvl]}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
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