import { useEffect, useMemo, useState } from "react";

const skillsFromProfiles = ["JavaScript", "React", "Git", "DSA", "SQL", "Node.js"];
const calendarDays = Array.from({ length: 35 }, (_, index) => ({ date: index + 1, github: [1, 2, 5, 6, 8, 12, 13, 16, 19, 20, 22, 25, 26, 27, 30, 31, 33, 34].includes(index), leetcode: [0, 2, 3, 5, 8, 9, 12, 15, 16, 18, 20, 21, 24, 25, 27, 30, 32, 34].includes(index) }));

function decodeGoogleCredential(credential) {
  try { return JSON.parse(atob(credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return null; }
}

export default function Profile() {
  const [accountMode, setAccountMode] = useState("signup");
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem("newbert-profile") || "null"));
  const [googleReady, setGoogleReady] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [links, setLinks] = useState({ github: "", leetcode: "", linkedin: "", bio: "" });
  const [skills, setSkills] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => setGoogleReady(true);
    document.head.appendChild(script);
    return () => script.remove();
  }, [googleClientId]);

  const signInWithGoogle = () => {
    if (!googleClientId || !googleReady || !window.google) { setAuthMessage("Google sign-in needs a VITE_GOOGLE_CLIENT_ID before it can open."); return; }
    window.google.accounts.id.initialize({ client_id: googleClientId, callback: ({ credential }) => { const account = decodeGoogleCredential(credential); if (account?.email) { setProfile({ name: account.name || account.given_name || "Newbert student", email: account.email }); setAuthMessage(""); } } });
    window.google.accounts.id.prompt();
  };

  const saveProfile = () => {
    const next = { ...profile, ...links, skills };
    localStorage.setItem("newbert-profile", JSON.stringify(next));
    setProfile(next);
    setShowSetup(false);
  };

  const analyzeLinks = () => {
    setIsAnalyzing(true);
    window.setTimeout(() => { setSkills(skillsFromProfiles); setIsAnalyzing(false); }, 700);
  };

  if (!profile) return <main className="profile-page min-h-screen px-5 py-12 md:py-16"><div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_.85fr] lg:items-center"><section><p className="eyebrow">Your Newbert identity</p><h1 className="mt-3 text-3xl font-extrabold text-slate-950 md:text-5xl">Build your profile once. Let every plan use it.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">Your profile connects your learning, placement goals, projects, GitHub activity, and LeetCode practice into one student context.</p><div className="mt-8 flex gap-6 border-b border-slate-200"><button onClick={() => setAccountMode("signup")} className={`pb-3 text-sm font-extrabold ${accountMode === "signup" ? "border-b-2 border-teal-700 text-teal-700" : "text-slate-500"}`}>New here? Sign up</button><button onClick={() => setAccountMode("signin")} className={`pb-3 text-sm font-extrabold ${accountMode === "signin" ? "border-b-2 border-teal-700 text-teal-700" : "text-slate-500"}`}>Already a member? Sign in</button></div><div className="mt-7 surface p-6"><p className="text-lg font-extrabold text-slate-950">{accountMode === "signup" ? "Start with your Google account" : "Welcome back"}</p><p className="mt-2 text-sm leading-6 text-slate-600">Google supplies only your basic name and email. You choose which public learning profiles to connect next.</p><button onClick={signInWithGoogle} className="mt-6 flex w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 hover:border-teal-700"><span className="grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] text-white">G</span>Continue with Google</button>{authMessage && <p className="mt-3 text-xs leading-5 text-orange-700">{authMessage}</p>}</div></section><aside className="border-l-2 border-teal-700 bg-teal-50 p-6"><p className="text-xs font-extrabold uppercase tracking-[.15em] text-teal-700">What you get</p><div className="mt-5 space-y-5"><Feature title="Skill map" text="Turn public GitHub and coding activity into placement-ready skills."/><Feature title="Combined streak" text="One calendar for contributions and problem-solving consistency."/><Feature title="Better recommendations" text="Courses, jobs, and resume insights use your actual profile context."/></div></aside></div></main>;

  if (showSetup || !profile.github) return <ProfileSetup profile={profile} links={links} setLinks={setLinks} skills={skills} isAnalyzing={isAnalyzing} analyzeLinks={analyzeLinks} saveProfile={saveProfile} />;
  return <ProfileDashboard profile={profile} setShowSetup={setShowSetup} />;
}

function ProfileSetup({ profile, links, setLinks, skills, isAnalyzing, analyzeLinks, saveProfile }) {
  const updateLink = (field, value) => setLinks((current) => ({ ...current, [field]: value }));
  return <main className="profile-page min-h-screen px-5 py-12 md:py-16"><div className="mx-auto max-w-4xl"><p className="eyebrow">Complete your profile</p><h1 className="mt-3 text-3xl font-extrabold text-slate-950 md:text-4xl">Hi, {profile.name}. Add the proof behind your progress.</h1><p className="mt-3 text-sm text-slate-600">Your email stays private. Public links help Newbert personalize your recommendations.</p><section className="surface mt-8 grid gap-6 p-6 md:grid-cols-2"><label className="text-sm font-bold text-slate-800">GitHub profile link<input value={links.github} onChange={(event) => updateLink("github", event.target.value)} className="control mt-2 w-full" placeholder="https://github.com/username"/></label><label className="text-sm font-bold text-slate-800">LeetCode profile link<input value={links.leetcode} onChange={(event) => updateLink("leetcode", event.target.value)} className="control mt-2 w-full" placeholder="https://leetcode.com/username"/></label><label className="text-sm font-bold text-slate-800 md:col-span-2">LinkedIn profile link<input value={links.linkedin} onChange={(event) => updateLink("linkedin", event.target.value)} className="control mt-2 w-full" placeholder="https://linkedin.com/in/username"/></label><label className="text-sm font-bold text-slate-800 md:col-span-2">Short bio<textarea value={links.bio} onChange={(event) => updateLink("bio", event.target.value)} className="control mt-2 min-h-28 w-full resize-y" placeholder="Your branch, graduation year, target role, and what you are working on..."/></label></section><section className="surface mt-5 p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm font-extrabold text-slate-950">Detect your skills</p><p className="mt-1 text-sm text-slate-600">Newbert will use connected public profiles to build your initial skill map.</p></div><button onClick={analyzeLinks} disabled={!links.github || !links.leetcode || isAnalyzing} className={`rounded-md px-4 py-2.5 text-sm font-extrabold ${links.github && links.leetcode && !isAnalyzing ? "bg-teal-700 text-white hover:bg-teal-800" : "bg-slate-100 text-slate-400"}`}>{isAnalyzing ? "Analyzing profiles..." : "Detect skills"}</button></div>{skills.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="bg-teal-50 px-2.5 py-1.5 text-xs font-extrabold text-teal-800">{skill}</span>)}</div>}</section><button onClick={saveProfile} disabled={!links.github || !links.leetcode} className={`mt-6 rounded-md px-5 py-3 text-sm font-extrabold ${links.github && links.leetcode ? "bg-teal-700 text-white hover:bg-teal-800" : "bg-slate-200 text-slate-500"}`}>Save profile and open dashboard</button></div></main>;
}

function ProfileDashboard({ profile, setShowSetup }) {
  const activeDays = useMemo(() => calendarDays.filter((day) => day.github || day.leetcode).length, []);
  return <main className="profile-page min-h-screen px-5 py-12 md:py-16"><div className="mx-auto max-w-6xl"><header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-8 md:flex-row md:items-end"><div><p className="eyebrow">Your placement profile</p><h1 className="mt-3 text-3xl font-extrabold text-slate-950 md:text-4xl">{profile.name}</h1><p className="mt-2 text-sm text-slate-600">{profile.email} · {profile.bio || "Student profile"}</p></div><button onClick={() => setShowSetup(true)} className="border border-slate-300 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:border-teal-700">Edit profile links</button></header><section className="mt-8 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div className="surface p-6"><p className="text-xs font-extrabold uppercase tracking-[.15em] text-teal-700">Connected profiles</p><div className="mt-5 space-y-3"><ExternalProfile label="GitHub" href={profile.github}/><ExternalProfile label="LeetCode" href={profile.leetcode}/><ExternalProfile label="LinkedIn" href={profile.linkedin}/></div><p className="mt-7 text-xs font-extrabold uppercase tracking-[.14em] text-slate-500">Detected skills</p><div className="mt-3 flex flex-wrap gap-2">{(profile.skills || skillsFromProfiles).map((skill) => <span key={skill} className="bg-teal-50 px-2.5 py-1.5 text-xs font-extrabold text-teal-800">{skill}</span>)}</div></div><div className="surface p-6"><div className="flex items-end justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-teal-700">Consistency calendar</p><h2 className="mt-2 text-2xl font-extrabold text-slate-950">Combined learning streak</h2></div><p className="text-3xl font-extrabold text-teal-700">{activeDays}</p></div><p className="mt-2 text-sm text-slate-600">A day counts when you contribute on GitHub, solve on LeetCode, or do both.</p><div className="mt-7 grid grid-cols-7 gap-2">{calendarDays.map((day) => <div key={day.date} title={`Day ${day.date}: ${day.github ? "GitHub " : ""}${day.leetcode ? "LeetCode" : "No activity"}`} className={`aspect-square border p-1 text-right text-[10px] font-bold ${day.github && day.leetcode ? "border-teal-700 bg-teal-700 text-white" : day.github ? "border-teal-200 bg-teal-100 text-teal-800" : day.leetcode ? "border-orange-300 bg-orange-100 text-orange-800" : "border-slate-200 text-slate-400"}`}>{day.date}</div>)}</div><div className="mt-5 flex flex-wrap gap-4 text-xs font-bold text-slate-600"><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-teal-100"/>GitHub</span><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-orange-100"/>LeetCode</span><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-teal-700"/>Both</span></div></div></section></div></main>;
}

function ExternalProfile({ label, href }) { return <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between border border-slate-200 px-3 py-3 text-sm font-extrabold text-slate-700 hover:border-teal-700"><span>{label}</span><span className="text-teal-700">Open</span></a>; }
function Feature({ title, text }) { return <div><p className="font-extrabold text-slate-950">{title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>; }
