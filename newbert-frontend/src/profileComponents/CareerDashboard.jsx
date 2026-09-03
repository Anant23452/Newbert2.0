import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { animate, AnimatePresence, motion as Motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Code2,
  ExternalLink,
  Eye,
  Flame,
  FolderGit2,
  Github,
  GraduationCap,
  Linkedin,
  Lock,
  LogOut,
  Pencil,
  Route,
  Target,
  X,
  Zap,
} from "lucide-react";
import API from "../Services/api";
import { addImprovementPlan, getNextUnlocks, previewImprovementPlan, submitImprovementEvidence, updateImprovementTask } from "../Services/improvementPlanService";
import MomentumSection from "./MomentumSection";
import FeaturedProjects from "./FeaturedProjects";
import SkillsNewbertUnderstands from "./SkillsNewbertUnderstands";
import PrivacySelector from "./PrivacySelector";
import useAuth from "../hook/useAuth";

const reveal = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: "easeOut" } },
};

const normalize = (value) => String(value || "").trim().toLowerCase();
const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const skillName = (skill) => typeof skill === "string" ? skill : skill?.name;

const DEFAULT_PROFILE_PRIVACY = { profileVisibility: "public", sections: { about: true, skills: true, projects: true, github: true, leetcode: true, linkedin: false, achievements: true, education: true, careerGoal: true, courses: true, activityHeatmap: true, streakStats: true, leaderboardRank: true } };
const normalizeProfilePrivacy = (value) => ({
  profileVisibility: value?.profileVisibility === "private" ? "private" : "public",
  sections: { ...DEFAULT_PROFILE_PRIVACY.sections, ...(value?.sections || {}) },
});

export default function CareerDashboard({ profile, onEdit, onLogout }) {
  const { refreshProfile } = useAuth();
  const [seniorMatch, setSeniorMatch] = useState({ loading: true, match: null, closest: [], benchmark: null, goal: "", reason: "", error: "" });
  const [privacy, setPrivacy] = useState(() => normalizeProfilePrivacy(profile.privacy));
  const [privacyState, setPrivacyState] = useState({ saving: "", status: "" });
  const [streakSnapshot, setStreakSnapshot] = useState({ loading: true, data: null });
  const privacyRequests = useRef({});

  useEffect(() => {
    setPrivacy(normalizeProfilePrivacy(profile?.privacy));
  }, [profile?.privacy]);

  useEffect(() => {
    if (!privacyState.status) return undefined;
    const timer = window.setTimeout(() => setPrivacyState((current) => ({ ...current, status: "" })), 2600);
    return () => window.clearTimeout(timer);
  }, [privacyState.status]);

  const updatePrivacy = async (key, value) => {
    const sectionKey = key === "bio" ? "about" : key;
    const requestId = (privacyRequests.current[key] || 0) + 1;
    privacyRequests.current[key] = requestId;
    let previousValue;
    setPrivacy((current) => {
      previousValue = key === "profileVisibility" ? current.profileVisibility : current.sections[sectionKey];
      return key === "profileVisibility"
        ? { ...current, profileVisibility: value }
        : { ...current, sections: { ...current.sections, [sectionKey]: value === "public" } };
    });
    setPrivacyState({ saving: key, status: "" });
    try {
      const { data } = await API.patch("/profiles/privacy", { field: key, visibility: value });
      if (privacyRequests.current[key] !== requestId) return;
      const confirmed = normalizeProfilePrivacy(data.privacy);
      setPrivacy((current) => key === "profileVisibility"
        ? { ...current, profileVisibility: confirmed.profileVisibility }
        : { ...current, sections: { ...current.sections, [sectionKey]: confirmed.sections[sectionKey] } });
      if (refreshProfile) await refreshProfile();
      setPrivacyState({ saving: "", status: "Privacy saved" });
    } catch (error) {
      if (privacyRequests.current[key] !== requestId) return;
      setPrivacy((current) => key === "profileVisibility"
        ? { ...current, profileVisibility: previousValue }
        : { ...current, sections: { ...current.sections, [sectionKey]: previousValue } });
      setPrivacyState({ saving: "", status: error.response?.data?.message || "Could not save privacy" });
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setSeniorMatch({ loading: true, match: null, closest: [], benchmark: null, goal: "", reason: "", error: "" });
    API.get("/alumni/closest?limit=3", { signal: controller.signal }).then(({ data }) => {
      const closest = data.closest || [];
      const first = closest[0];
      const match = first ? {
        ...first.match,
        score: first.match.overallScore,
        matchedSkills: first.matchedSkills || [],
        missingSkills: first.missingSkills || [],
        senior: {
          id: first.alumni._id,
          name: first.alumni.name,
          company: first.alumni.placement?.company || first.alumni.company,
          role: first.alumni.placement?.role || first.alumni.role,
          package: first.alumni.placement?.packageLpa ?? first.alumni.package,
          college: first.alumni.college,
        },
      } : null;
      setSeniorMatch({ loading: false, match, closest, benchmark: data.benchmark || null, goal: data.goal || "", reason: "", error: "" });
    }).catch((error) => {
      if (error.code !== "ERR_CANCELED") setSeniorMatch({ loading: false, match: null, closest: [], benchmark: null, goal: "", reason: "", error: error.response?.data?.message || "Unable to calculate your senior match." });
    });
    return () => controller.abort();
  }, [profile.college, profile.lastSyncedAt]);

  useEffect(() => {
    const controller = new AbortController();
    if (privacy.profileVisibility !== "public" || !privacy.sections.leaderboardRank || !privacy.sections.streakStats) {
      setStreakSnapshot({ loading: false, data: { visible: false } });
      return () => controller.abort();
    }
    setStreakSnapshot({ loading: true, data: null });
    Promise.all([
      API.get("/leaderboard", { params: { scope: "college" }, signal: controller.signal }),
      API.get("/leaderboard", { params: { scope: "global" }, signal: controller.signal }),
    ]).then(([collegeResponse, globalResponse]) => {
      const college = collegeResponse.data.streak;
      const global = globalResponse.data.streak;
      setStreakSnapshot({ loading: false, data: { visible: true, collegeRank: college?.currentUser?.rank || null, globalRank: global?.currentUser?.rank || null } });
    }).catch((error) => { if (error.code !== "ERR_CANCELED") setStreakSnapshot({ loading: false, data: null }); });
    return () => controller.abort();
  }, [privacy.profileVisibility, privacy.sections.leaderboardRank, privacy.sections.streakStats, profile.lastSyncedAt]);

  return <CareerDashboardView profile={profile} seniorMatch={seniorMatch} streakSnapshot={streakSnapshot} privacy={privacy} privacyState={privacyState} onPrivacyChange={updatePrivacy} onProfileUpdated={refreshProfile} onEdit={onEdit} onLogout={onLogout} />;
}

function CareerDashboardView({
  profile,
  seniorMatch,
  streakSnapshot,
  privacy,
  privacyState,
  onPrivacyChange,
  onProfileUpdated,
  onEdit,
  onLogout,
}) {
  const activityTotal = useMemo(
    () => (profile.activityCalendar || []).reduce((sum, day) => sum + (Number(day.total) || Number(day.github) + Number(day.leetcode) || 0), 0),
    [profile.activityCalendar],
  );
  const verifiedSkills = (profile.skills || []).filter((skill) => Number(skill?.score) > 0).length;
  const initials = profile.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <main className="profile-page min-h-screen bg-[#0b1220] px-4 py-8 text-white md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <ProfileSubnav />

        <Motion.section
          id="overview"
          initial="hidden"
          animate="visible"
          variants={reveal}
          className="scroll-mt-32 overflow-hidden rounded-lg bg-[#111c2e] shadow-[0_20px_60px_rgba(0,0,0,.2)]"
        >
          <div className="h-24 bg-[#2b211f] bg-cover bg-center md:h-28" style={profile.cover ? { backgroundImage: `url(${profile.cover})` } : undefined} />
          <div className="px-5 pb-6 md:px-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-4">
                <div className="-mt-10 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-[#111c2e] bg-orange-500 text-xl font-black text-white">
                  {profile.avatar ? <img src={profile.avatar} alt={`${profile.name} profile`} className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="min-w-0 pb-1">
                  <p className="text-xs font-extrabold uppercase text-orange-400">Student career dashboard</p>
                  <h1 className="mt-1 truncate text-2xl font-black text-white md:text-3xl">{profile.name}</h1>
                  <p className="mt-1 text-sm text-slate-300">
                    {[profile.college, profile.branch, profile.graduationYear && `Class of ${profile.graduationYear}`, profile.targetRole].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PrivacySelect label="Profile" value={privacy.profileVisibility} onChange={(value) => onPrivacyChange("profileVisibility", value)} disabled={Boolean(privacyState.saving)} dark />
                {privacy.profileVisibility === "private" && <span className="rounded-md border border-orange-400/30 bg-orange-400/10 px-2 py-1.5 text-[11px] font-extrabold text-orange-200">Private profile</span>}
                <Link to={`/profile/${profile.userId}`} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/15 px-3 text-xs font-extrabold text-slate-300 hover:border-orange-400 hover:text-white transition">
                  <Eye size={14} /> Public view
                </Link>
                <button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-2 rounded-md bg-orange-500 px-3 text-xs font-extrabold text-slate-950 hover:bg-orange-400">
                  <Pencil size={15} /> Edit
                </button>
                <button type="button" onClick={onLogout} title="Log out" aria-label="Log out" className="grid h-9 w-9 place-items-center rounded-md border border-white/15 text-slate-300 hover:border-red-400 hover:text-red-300">
                  <LogOut size={16} />
                </button>
              </div>
            </div>

            {privacy.profileVisibility === "private" && (
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3.5 text-xs font-bold text-orange-200">
                <div className="flex items-center gap-2.5">
                  <Lock size={16} className="text-orange-400 shrink-0" />
                  <span>Your profile is currently <strong>PRIVATE</strong>. Other students and recruiters cannot view your skills, projects, or activity.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/profile/${profile.userId}`} className="rounded border border-orange-400/40 bg-orange-400/20 px-2.5 py-1 text-[11px] font-black text-orange-100 hover:bg-orange-400/30 transition">
                    Preview Locked View
                  </Link>
                  <button type="button" onClick={() => onPrivacyChange("profileVisibility", "public")} className="rounded bg-orange-500 px-2.5 py-1 text-[11px] font-black text-slate-950 hover:bg-orange-400 transition">
                    Make Public
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-white/10 lg:grid-cols-4">
              <SummaryMetric icon={Activity} label="Verified activities" value={activityTotal} />
              <SummaryMetric icon={CheckCircle2} label="Verified skills" value={verifiedSkills} />
              <SummaryMetric icon={FolderGit2} label="Projects" value={Number(profile.projects) || 0} />
              <SummaryMetric icon={Route} label="Career progress" value={Number(profile.profileStrength) || 0} suffix="%" />
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-3">
              <ConnectionCard platform="GitHub" icon={Github} connection={profile.connections?.github} username={profile.githubUsername} detail={profile.githubStats ? `${profile.githubStats.publicRepos} public repositories` : "Your code story is missing. Connect GitHub to verify projects and development activity."} onEdit={onEdit} visibility={privacy.sections.github} onVisibilityChange={(value) => onPrivacyChange("github", value)} disabled={Boolean(privacyState.saving)} />
              <ConnectionCard platform="LeetCode" icon={Code2} connection={profile.connections?.leetcode} username={profile.leetcodeUsername} detail={profile.leetcodeStats ? `${profile.leetcodeStats.totalSolved} problems solved` : "Unlock your DSA graph by adding your LeetCode username."} onEdit={onEdit} visibility={privacy.sections.leetcode} onVisibilityChange={(value) => onPrivacyChange("leetcode", value)} disabled={Boolean(privacyState.saving)} />
              <ConnectionCard platform="LinkedIn" icon={Linkedin} connection={profile.connections?.linkedin} detail={profile.linkedin ? "Career profile linked" : "Add LinkedIn so seniors can understand your career direction."} onEdit={onEdit} visibility={privacy.sections.linkedin} onVisibilityChange={(value) => onPrivacyChange("linkedin", value)} disabled={privacyState.saving === "linkedin"} />
            </div>

            {profile.bio ? (
              <div className="mt-5 flex items-start justify-between gap-4 border-t border-white/10 pt-4">
                <p className="max-w-3xl text-sm leading-6 text-slate-300">{profile.bio}</p>
                <PrivacySelect value={privacy.sections.about ? "public" : "private"} onChange={(value) => onPrivacyChange("bio", value)} disabled={privacyState.saving === "bio"} dark />
              </div>
            ) : null}
          </div>
        </Motion.section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
          <DeveloperDna profile={profile} />
          <SeniorComparison profile={profile} state={seniorMatch} />
        </div>

        <NextUnlocks />

        <section id="activity" className="scroll-mt-32 mt-6">
          <MomentumSection
            activityCalendar={profile.activityCalendar || []}
            lastSyncedAt={profile.lastSyncedAt}
            currentStreak={profile.currentStreak}
            longestStreak={profile.longestStreak}
            ownerName={profile.name}
            isOwn
            compact
            collegeRank={streakSnapshot.data?.collegeRank}
            loadingRank={streakSnapshot.loading}
            heatmapVisible={privacy.sections.activityHeatmap}
            streakStatsVisible={privacy.sections.streakStats}
          />
          <div className="mt-3 flex flex-wrap justify-end gap-3">
            <PrivacySelect label="Heatmap" value={privacy.sections.activityHeatmap ? "public" : "private"} onChange={(value) => onPrivacyChange("activityHeatmap", value)} disabled={Boolean(privacyState.saving)} dark />
            <PrivacySelect label="Streak" value={privacy.sections.streakStats ? "public" : "private"} onChange={(value) => onPrivacyChange("streakStats", value)} disabled={Boolean(privacyState.saving)} dark />
            <PrivacySelect label="Rank" value={privacy.sections.leaderboardRank ? "public" : "private"} onChange={(value) => onPrivacyChange("leaderboardRank", value)} disabled={Boolean(privacyState.saving)} dark />
          </div>
        </section>

        <JourneyTimeline profile={profile} />
        <SkillsNewbertUnderstands profile={profile} onProfileUpdated={() => { window.location.reload(); }} onEdit={onEdit} />
        <FeaturedProjects profile={profile} onEdit={onEdit} onProfileUpdated={onProfileUpdated} />

        <AnimatePresence>
          {privacyState.status ? (
            <Motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} role="status" className="fixed bottom-5 right-5 z-[120] rounded-md border border-orange-400/30 bg-[#111c2e] px-4 py-3 text-xs font-bold text-white shadow-2xl">
              {privacyState.status}
            </Motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}

function ProfileSubnav() {
  return (
    <nav aria-label="Profile sections" className="sticky top-16 z-20 -mx-1 mb-4 overflow-x-auto rounded-md border border-white/10 bg-[#0b1220]/95 px-2 py-2 backdrop-blur">
      <div className="flex min-w-max items-center gap-1">
        {[['Overview', 'overview'], ['Skills', 'skills'], ['Activity', 'activity'], ['Journey', 'journey'], ['Projects', 'featured-projects']].map(([label, id]) => (
          <a key={id} href={`#${id}`} className="rounded-md px-3 py-2 text-xs font-extrabold text-slate-400 hover:bg-white/5 hover:text-orange-300">{label}</a>
        ))}
      </div>
    </nav>
  );
}

function SummaryMetric({ icon, label, value, suffix = "" }) {
  return (
    <div className="bg-[#0e1828] px-4 py-4 md:px-5">
      <div className="flex items-center gap-2 text-slate-400">{createElement(icon, { size: 15 })}<span className="text-[11px] font-bold uppercase">{label}</span></div>
      <p className="mt-2 text-2xl font-black text-white"><CountUp value={value} />{suffix}</p>
    </div>
  );
}

function CountUp({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, Number(value) || 0, { duration: 0.7, ease: "easeOut", onUpdate: (latest) => setDisplay(Math.round(latest)) });
    return () => controls.stop();
  }, [value]);
  return display.toLocaleString();
}

const PrivacySelect = PrivacySelector;

function ConnectionCard({ platform, icon, connection, username, detail, onEdit, visibility, onVisibilityChange, disabled }) {
  const connected = Boolean(connection?.connected);
  return (
    <div className="rounded-lg bg-white/[.045] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`grid h-8 w-8 place-items-center rounded-full ${connected ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-slate-400"}`}>{createElement(icon, { size: 16 })}</span>
          <div><p className="text-xs font-extrabold text-white">{platform}</p><p className={`mt-0.5 text-[10px] font-bold uppercase ${connected ? "text-emerald-300" : "text-slate-500"}`}>{connected ? "Connected" : "Setup needed"}</p></div>
        </div>
        <PrivacySelect value={visibility ? "public" : "private"} onChange={onVisibilityChange} disabled={disabled} dark />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{connection?.error || (username ? `@${username} · ${detail}` : detail)}</p>
      {!connected || connection?.error ? <button type="button" onClick={onEdit} className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-orange-300 hover:text-orange-200">{connected ? "Fix connection" : `Connect ${platform}`} <ArrowUpRight size={13} /></button> : null}
    </div>
  );
}

function buildDna(profile) {
  const skills = (profile.skills || []).map((skill) => ({ name: skillName(skill), score: numeric(skill?.score), source: skill?.source }));
  const findScore = (matcher) => {
    const values = skills.filter((skill) => skill.score != null && matcher(normalize(skill.name))).map((skill) => skill.score);
    return values.length ? Math.round(values.reduce((sum, score) => sum + score, 0) / values.length) : null;
  };
  const developmentSkills = skills.filter((skill) => skill.score != null && !/(dsa|problem solving|dbms|operating system|computer network|oop|fundamental)/.test(normalize(skill.name)));
  const development = developmentSkills.length ? Math.round(developmentSkills.reduce((sum, skill) => sum + skill.score, 0) / developmentSkills.length) : profile.githubStats ? Math.min(100, (Number(profile.githubStats.publicRepos) || 0) * 10) : null;
  const projects = profile.projects == null ? null : Math.min(100, Number(profile.projects) * 25);
  return [
    { label: "Development", value: development, source: profile.githubStats ? "GitHub evidence" : "Skill evidence" },
    { label: "DSA", value: findScore((name) => /(dsa|problem solving)/.test(name)), source: profile.leetcodeStats ? "LeetCode evidence" : "Not connected" },
    { label: "CS fundamentals", value: findScore((name) => /(dbms|operating system|computer network|oop|sql|fundamental)/.test(name)), source: "Verified skills" },
    { label: "Projects", value: projects, source: profile.projects == null ? "Not recorded" : `${profile.projects} recorded` },
  ];
}

function DeveloperDna({ profile }) {
  const areas = useMemo(() => buildDna(profile), [profile]);
  const available = areas.filter((area) => area.value != null);
  const strongest = [...available].sort((a, b) => b.value - a.value)[0];
  const weakest = [...available].sort((a, b) => a.value - b.value)[0];
  return (
    <Motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} className="rounded-lg bg-[#111c2e] p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-extrabold uppercase text-orange-400">Developer DNA</p><h2 className="mt-1 text-xl font-black text-white">Your evidence shape</h2></div>
        <Zap size={20} className="text-orange-400" />
      </div>
      <div className="mt-6 space-y-5">
        {areas.map((area, index) => <DnaBar key={area.label} area={area} index={index} />)}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Signal label="Strongest" value={strongest?.label || "Connect evidence"} tone="text-emerald-300" />
        <Signal label="Build next" value={weakest?.label || "Complete profile"} tone="text-orange-300" />
      </div>
    </Motion.section>
  );
}

function DnaBar({ area, index }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-extrabold text-slate-100">{area.label}</p><p className="mt-0.5 text-[11px] text-slate-500">{area.source}</p></div><p className="text-sm font-black text-white">{area.value == null ? "--" : `${area.value}%`}</p></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.07]"><Motion.div initial={{ width: 0 }} whileInView={{ width: `${area.value || 0}%` }} viewport={{ once: true }} transition={{ duration: 0.65, delay: index * 0.08 }} className={`h-full rounded-full ${area.value != null && area.value >= 65 ? "bg-emerald-400" : "bg-orange-400"}`} /></div>
    </div>
  );
}

function Signal({ label, value, tone }) {
  return <div className="rounded-lg bg-white/[.04] p-3"><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><p className={`mt-1 text-sm font-black ${tone}`}>{value}</p></div>;
}

function comparisonRows(profile, alumni) {
  if (!alumni) return [];
  const mineSkills = (profile.skills || []).map((skill) => normalize(skillName(skill))).filter(Boolean);
  const seniorSkills = (alumni.skills || []).map(normalize).filter(Boolean);
  const fundamentals = (alumni.csFundamentals || alumni.placementPreparation?.csFundamentals?.subjects || []).map((item) => normalize(item?.subject || item));
  const overlap = (items) => items.length ? Math.round((items.filter((item) => mineSkills.includes(item)).length / items.length) * 100) : null;
  const seniorDsa = numeric(alumni.placementPreparation?.dsa?.totalSolved ?? alumni.placementPreparation?.dsa?.solved ?? alumni.dsa?.solved ?? alumni.dsaSolved);
  const seniorProjects = numeric(alumni.placementPreparation?.development?.projects?.length ?? alumni.projects);
  const seniorRepos = numeric(alumni.github?.repositories ?? alumni.githubPublicRepos);
  return [
    { label: "DSA solved", student: numeric(profile.leetcodeStats?.totalSolved), senior: seniorDsa },
    { label: "Projects", student: numeric(profile.projects), senior: seniorProjects },
    { label: "GitHub repos", student: numeric(profile.githubStats?.publicRepos), senior: seniorRepos },
    { label: "CS fundamentals", student: overlap(fundamentals), senior: fundamentals.length ? 100 : null, suffix: "%" },
    { label: "Relevant skills", student: overlap(seniorSkills), senior: seniorSkills.length ? 100 : null, suffix: "%" },
  ];
}

function SeniorComparison({ profile, state }) {
  const [open, setOpen] = useState(false);
  if (state.loading) return <DashboardSkeleton label="Finding your closest senior..." />;
  const entry = state.closest?.[0];
  const alumni = entry?.alumni;
  if (!state.match || !alumni) return (
    <section className="flex min-h-80 flex-col justify-between rounded-lg bg-[#111c2e] p-6">
      <div><p className="text-xs font-extrabold uppercase text-orange-400">You vs placed senior</p><h2 className="mt-4 text-2xl font-black text-white">Find your future version.</h2><p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Complete your profile and connect activity sources to match with seniors who started like you.</p></div>
      <Link to="/alumni-wall" className="mt-8 inline-flex w-fit items-center gap-2 rounded-md bg-orange-500 px-4 py-2.5 text-sm font-extrabold text-slate-950">Browse alumni <ArrowUpRight size={15} /></Link>
    </section>
  );
  const rows = comparisonRows(profile, alumni);
  const comparable = rows.filter((row) => row.student != null && row.senior != null);
  const biggest = [...comparable].sort((a, b) => ((b.senior - b.student) / Math.max(b.senior, 1)) - ((a.senior - a.student) / Math.max(a.senior, 1)))[0];
  const firstName = alumni.name.split(" ")[0];
  return (
    <Motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} className="rounded-lg bg-[#111c2e] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase text-orange-400">You vs placed senior</p><h2 className="mt-1 text-xl font-black text-white">You are {state.match.score}% similar to {firstName}'s pre-placement profile.</h2><p className="mt-1 text-xs text-slate-400">{alumni.placement?.company || alumni.company || "Verified outcome"} · {alumni.placement?.role || alumni.role || "Placed senior"}</p></div><p className="text-4xl font-black text-orange-400">{state.match.score}%</p></div>
      <div className="mt-6 space-y-4">{rows.map((row, index) => <ComparisonBar key={row.label} row={row} index={index} />)}</div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><p className="text-xs font-bold text-slate-400">Biggest gap: <span className="text-orange-300">{biggest?.label || state.match.missingSkills?.[0]?.skill || "More evidence needed"}</span></p><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-orange-400">See how {firstName} prepared <ArrowUpRight size={15} /></button></div>
      <SeniorDrawer open={open} onClose={() => setOpen(false)} alumni={alumni} />
    </Motion.section>
  );
}

function ComparisonBar({ row, index }) {
  const available = row.student != null && row.senior != null;
  const max = Math.max(row.student || 0, row.senior || 0, 1);
  return (
    <div>
      <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-300">{row.label}</span><span className="text-slate-500">You {row.student == null ? "--" : `${row.student}${row.suffix || ""}`} · Senior {row.senior == null ? "--" : `${row.senior}${row.suffix || ""}`}</span></div>
      <div className="mt-2 grid gap-1.5"><div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]"><Motion.div initial={{ width: 0 }} whileInView={{ width: available ? `${Math.max(4, (row.student / max) * 100)}%` : "0%" }} viewport={{ once: true }} transition={{ duration: 0.55, delay: index * 0.05 }} className="h-full rounded-full bg-orange-400" /></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]"><Motion.div initial={{ width: 0 }} whileInView={{ width: available ? `${Math.max(4, (row.senior / max) * 100)}%` : "0%" }} viewport={{ once: true }} transition={{ duration: 0.55, delay: index * 0.05 + 0.08 }} className="h-full rounded-full bg-emerald-400" /></div></div>
    </div>
  );
}

function SeniorDrawer({ open, onClose, alumni }) {
  const phases = alumni.placementPreparation?.preparationPhases || alumni.gatePreparation?.preparationPhases || [];
  const projects = alumni.projectsDetail || alumni.placementPreparation?.development?.projects || [];
  return (
    <AnimatePresence>
      {open ? <Motion.div className="fixed inset-0 z-[90] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
        <Motion.aside role="dialog" aria-modal="true" aria-label={`${alumni.name} preparation details`} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} onMouseDown={(event) => event.stopPropagation()} className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-[#111c2e] p-5 text-white shadow-2xl md:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase text-orange-400">Senior preparation</p><h2 className="mt-1 text-2xl font-black">{alumni.name}</h2><p className="mt-1 text-sm text-slate-400">{alumni.placement?.company || alumni.company} · {alumni.placement?.role || alumni.role}</p></div><button type="button" onClick={onClose} title="Close" aria-label="Close senior preparation" className="grid h-9 w-9 place-items-center rounded-md border border-white/15 text-slate-300"><X size={17} /></button></div>
          <DrawerBlock title="Preparation strategy"><p>{alumni.journey || alumni.advice || "Open the full senior profile to explore the verified preparation record."}</p></DrawerBlock>
          {alumni.skills?.length ? <DrawerBlock title="Skills mastered"><div className="flex flex-wrap gap-2">{alumni.skills.map((skill) => <span key={skill} className="rounded-md bg-orange-400/10 px-2.5 py-1 text-xs font-bold text-orange-200">{skill}</span>)}</div></DrawerBlock> : null}
          {projects.length ? <DrawerBlock title="Projects"><div className="space-y-2">{projects.slice(0, 5).map((project, index) => <p key={project.name || project.title || index} className="rounded-md bg-white/5 p-3 font-semibold text-slate-200">{project.name || project.title || project.description || `Project ${index + 1}`}</p>)}</div></DrawerBlock> : null}
          {phases.length ? <DrawerBlock title="Timeline"><div className="space-y-3">{phases.map((phase, index) => <div key={phase.title || index} className="border-l-2 border-orange-400 pl-3"><p className="font-extrabold text-white">{phase.title}</p><p className="text-xs text-slate-400">{phase.duration || `Phase ${index + 1}`}</p></div>)}</div></DrawerBlock> : null}
          {alumni.interviewExperience?.length ? <DrawerBlock title="Interview experience"><div className="space-y-3">{alumni.interviewExperience.slice(0, 4).map((item, index) => <p key={index}>{item.question || item.round || item.experience || String(item)}</p>)}</div></DrawerBlock> : null}
          <Link to={`/alumni-wall/${alumni._id}`} className="mt-7 inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2.5 text-sm font-extrabold text-slate-950">Open full profile <ExternalLink size={15} /></Link>
        </Motion.aside>
      </Motion.div> : null}
    </AnimatePresence>
  );
}

function DrawerBlock({ title, children }) {
  return <section className="mt-6 border-t border-white/10 pt-5"><h3 className="text-xs font-extrabold uppercase text-slate-400">{title}</h3><div className="mt-3 text-sm leading-6 text-slate-300">{children}</div></section>;
}

function NextUnlocks() {
  const [unlocks, setUnlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try { setUnlocks(await getNextUnlocks()); setError(""); }
    catch (requestError) { setError(requestError.response?.data?.message || "Couldn't load your next improvements."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openImprove = async (unlock) => {
    setSelected(unlock);
    setPreview({ loading: true });
    try { setPreview(await previewImprovementPlan(unlock.skill)); }
    catch (requestError) { setPreview({ error: requestError.response?.data?.message || "Couldn't create this plan. Try again." }); }
  };
  const add = async () => {
    if (!preview?.plan) return;
    setPreview((current) => ({ ...current, saving: true }));
    try {
      const result = await addImprovementPlan(preview.plan.skillName);
      setPreview({ plan: result.plan, existing: result.existing });
      setMessage(result.message);
      await load();
    } catch (requestError) { setPreview((current) => ({ ...current, error: requestError.response?.data?.message || "Couldn't add this plan. Try again.", saving: false })); }
  };
  const toggleTask = async (task) => {
    if (!preview?.plan?.id) return;
    const before = preview.plan;
    const tasks = before.tasks.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item);
    setPreview((current) => ({ ...current, plan: { ...before, tasks } }));
    try { const plan = await updateImprovementTask(before.id, task.id, !task.completed); setPreview((current) => ({ ...current, plan })); await load(); }
    catch (requestError) { setPreview((current) => ({ ...current, plan: before, error: requestError.response?.data?.message || "Couldn't save task progress." })); }
  };
  const submitEvidence = async (evidence) => {
    if (!preview?.plan?.id) return;
    const result = await submitImprovementEvidence(preview.plan.id, evidence);
    setPreview((current) => ({ ...current, plan: result.plan }));
    await load();
    return result;
  };
  return <Motion.section id="skills" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={reveal} className="scroll-mt-32 mt-6 rounded-lg bg-[#111c2e] p-5 md:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase text-orange-400">Next 3 unlocks</p><h2 className="mt-1 text-xl font-black text-white">The shortest useful moves</h2></div><Link to="/roadmap" className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-300">Open roadmap <ArrowUpRight size={13} /></Link></div>
    {loading ? <div className="mt-5 grid gap-3 md:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-lg bg-white/5" />)}</div> : error ? <p className="mt-5 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : unlocks.length ? <div className="mt-5 grid gap-3 md:grid-cols-3">{unlocks.map((unlock) => <UnlockCard key={unlock.skillId} unlock={unlock} onWhy={() => setSelected({ why: unlock })} onImprove={() => openImprove(unlock)} />)}</div> : <div className="mt-5 rounded-lg bg-emerald-400/10 p-5"><p className="font-extrabold text-emerald-200">No unresolved high-priority skill gaps right now.</p><p className="mt-1 text-sm text-slate-400">Newbert will update this list when your target or verified evidence changes.</p></div>}
    {message ? <div role="status" className="fixed bottom-5 right-5 z-[120] rounded-md border border-orange-400/30 bg-[#111c2e] px-4 py-3 text-xs font-bold text-white shadow-2xl">{message} <Link to="/roadmap" className="ml-2 text-orange-300 underline">View roadmap</Link></div> : null}
    <WhyUnlockDrawer unlock={selected?.why} onClose={() => setSelected(null)} />
    <ImproveSkillModal state={preview} onClose={() => setPreview(null)} onAdd={add} onToggleTask={toggleTask} onSubmitEvidence={submitEvidence} />
  </Motion.section>;
}

function UnlockCard({ unlock, onWhy, onImprove }) {
  const plan = unlock.plan;
  const state = plan?.status === "verified" ? "VERIFIED" : plan?.status === "evidence_submitted" ? "EVIDENCE SUBMITTED" : plan ? "LEARNING" : "NO EVIDENCE";
  const tone = state === "VERIFIED" ? "text-emerald-300 bg-emerald-400/10" : plan ? "text-orange-300 bg-orange-400/10" : "text-red-300 bg-red-400/10";
  return <Motion.article variants={reveal} className="rounded-lg bg-[#0d1727] p-4"><div className="flex items-start justify-between gap-3"><span className={`rounded-md px-2 py-1 text-[10px] font-extrabold uppercase ${tone}`}>{unlock.importance}</span><span className={`text-[10px] font-black ${state === "VERIFIED" ? "text-emerald-300" : "text-slate-300"}`}>{state}</span></div><h3 className="mt-4 text-lg font-black text-white">{unlock.skill}</h3>{plan ? <><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div style={{ width: `${plan.progressPercent || 0}%` }} className="h-full bg-orange-400" /></div><p className="mt-3 text-xs text-slate-400">{plan.tasks.filter((task) => task.completed).length} of {plan.tasks.length} actions complete · {plan.progressPercent || 0}%</p></> : <p className="mt-3 text-xs leading-5 text-slate-400">{unlock.cohortPercent ? `Found in ${unlock.cohortPercent}% of similar senior preparation paths.` : unlock.reason}</p>}<div className="mt-4 flex gap-2"><button type="button" onClick={onWhy} className="inline-flex items-center gap-1 rounded-md border border-white/15 px-3 py-2 text-xs font-extrabold text-slate-200"><CircleHelp size={14} /> Why?</button><button type="button" onClick={onImprove} className="flex-1 rounded-md bg-orange-500 px-3 py-2 text-xs font-extrabold text-slate-950">{plan ? "Continue plan" : "Improve"} <ArrowUpRight className="inline" size={13} /></button></div></Motion.article>;
}

function WhyUnlockDrawer({ unlock, onClose }) { return <AnimatePresence>{unlock ? <Motion.div className="fixed inset-0 z-[90] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><Motion.aside role="dialog" aria-modal="true" aria-label={`Why ${unlock.skill} matters`} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} onMouseDown={(event) => event.stopPropagation()} className="ml-auto h-full w-full max-w-md overflow-y-auto bg-[#111c2e] p-6 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase text-orange-400">Why this unlock</p><h2 className="mt-1 text-2xl font-black">{unlock.skill}</h2></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-white/15 text-slate-300"><X size={17} /></button></div><DrawerBlock title="Your profile"><p>{unlock.studentEvidence === "none" ? "No verified evidence currently supports this skill." : "Newbert has some evidence, but it is not yet sufficient for this target."}</p></DrawerBlock><DrawerBlock title="Alumni benchmark"><p>{unlock.alumniMatch?.total ? `${unlock.alumniMatch.matched} of ${unlock.alumniMatch.total} closest matching seniors recorded this skill. This influences recommendation priority only.` : "No comparable senior count is currently available."}</p></DrawerBlock><DrawerBlock title="Job / target requirement"><p>{unlock.targetRequirement ? "This skill is relevant to your selected role or target profile." : "This is suggested from your current benchmark context, not an asserted job requirement."}</p></DrawerBlock></Motion.aside></Motion.div> : null}</AnimatePresence>; }

function ImproveSkillModal({ state, onClose, onAdd, onToggleTask, onSubmitEvidence }) {
  const [evidenceType, setEvidenceType] = useState("manual_verification");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  if (!state) return null;
  const plan = state.plan;
  const submit = async () => { if (!plan?.id) return; setEvidenceBusy(true); setEvidenceError(""); try { await onSubmitEvidence({ type: evidenceType, url: evidenceUrl, note: evidenceNote }); setEvidenceUrl(""); setEvidenceNote(""); } catch (error) { setEvidenceError(error.response?.data?.message || "Couldn't submit evidence. Try again."); } finally { setEvidenceBusy(false); } };
  return <AnimatePresence><Motion.div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-4 md:grid md:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><Motion.section role="dialog" aria-modal="true" aria-label="Improve skill" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} onMouseDown={(event) => event.stopPropagation()} className="mx-auto my-4 w-full max-w-2xl rounded-lg border border-white/10 bg-[#111c2e] p-5 text-white md:my-0 md:p-7">{state.loading ? <p className="py-16 text-center text-sm font-bold text-slate-300">Building plan...</p> : state.error ? <div><p className="text-sm text-red-200">{state.error}</p><button onClick={onClose} className="mt-5 rounded-md border border-white/15 px-4 py-2 text-sm font-bold">Close</button></div> : plan ? <><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase text-orange-400">Improve skill</p><h2 className="mt-1 text-2xl font-black">Improve {plan.skillName}</h2><p className="mt-1 text-sm text-slate-400">Estimated effort: {plan.estimatedDays.min}-{plan.estimatedDays.max} days</p></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-white/15 text-slate-300"><X size={17}/></button></div><div className="mt-6 grid gap-3 md:grid-cols-3"><Info title="Your evidence" value={plan.reason.studentEvidenceStatus === "none" ? "No verified evidence" : plan.reason.studentEvidenceSummary}/><Info title="Alumni benchmark" value={plan.reason.alumniMatch.total ? `${plan.reason.alumniMatch.matched}/${plan.reason.alumniMatch.total} similar seniors` : "Unavailable"}/><Info title="Target" value={plan.targetLevel}/></div><h3 className="mt-6 text-sm font-black text-white">Your shortest useful plan</h3><div className="mt-3 space-y-2">{plan.tasks.map((task) => <label key={task.id} className="flex items-start gap-3 rounded-md bg-white/[.045] p-3"><input type="checkbox" checked={task.completed} disabled={!plan.id} onChange={() => onToggleTask(task)} className="mt-1 accent-orange-500"/><span><span className="block text-sm font-bold text-white">{task.order}. {task.title}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{task.description} · {task.estimatedMinutes} min</span></span></label>)}</div>{plan.id ? <div className="mt-6 border-t border-white/10 pt-5"><p className="text-xs font-bold uppercase text-slate-400">Submit evidence</p><p className="mt-1 text-xs leading-5 text-slate-500">Task completion is learning progress, not verification. Submitted evidence remains pending until Newbert can validate a supported source.</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} className="rounded-md border border-white/15 bg-[#0b1220] p-2 text-xs text-white"><option value="github_project">GitHub project</option><option value="course_assessment">Course assessment</option><option value="manual_verification">Other evidence</option></select><input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://evidence-link" className="rounded-md border border-white/15 bg-[#0b1220] p-2 text-xs text-white sm:col-span-2"/></div><input value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="What does this prove?" className="mt-2 w-full rounded-md border border-white/15 bg-[#0b1220] p-2 text-xs text-white"/>{evidenceError ? <p className="mt-2 text-xs font-bold text-red-200">{evidenceError}</p> : null}<button disabled={evidenceBusy} onClick={submit} className="mt-3 rounded-md border border-orange-400/40 px-3 py-2 text-xs font-bold text-orange-200 disabled:opacity-50">{evidenceBusy ? "Submitting..." : "Submit evidence"}</button></div> : null}<div className="mt-7 flex justify-end gap-3"><button onClick={onClose} className="rounded-md border border-white/15 px-4 py-2 text-sm font-bold text-slate-200">Maybe later</button>{!plan.id ? <button disabled={state.saving} onClick={onAdd} className="rounded-md bg-orange-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50">{state.saving ? "Adding..." : "Add to Roadmap"}</button> : <Link to="/roadmap" className="rounded-md bg-orange-500 px-4 py-2 text-sm font-black text-slate-950">View roadmap</Link>}</div></> : null}</Motion.section></Motion.div></AnimatePresence>;
}

function Info({ title, value }) { return <div className="rounded-md bg-white/[.045] p-3"><p className="text-[10px] font-extrabold uppercase text-slate-500">{title}</p><p className="mt-1 text-xs font-bold leading-5 text-slate-200">{value}</p></div>; }

function buildMilestones(profile) {
  const activity = [...(profile.activityCalendar || [])].filter((day) => day.date).sort((a, b) => a.date.localeCompare(b.date));
  const milestones = [];
  if (activity[0]) milestones.push({ title: "Verified activity started", detail: `${Number(activity[0].total) || Number(activity[0].github) + Number(activity[0].leetcode) || 0} activities recorded`, date: activity[0].date });
  if (profile.leetcodeStats?.totalSolved > 0) milestones.push({ title: `${profile.leetcodeStats.totalSolved} LeetCode solved`, detail: "Current verified DSA milestone", icon: Code2 });
  if (Number(profile.projects) > 0) milestones.push({ title: `${profile.projects} project${Number(profile.projects) === 1 ? "" : "s"} recorded`, detail: "Current portfolio milestone", icon: FolderGit2 });
  if (Number(profile.githubStats?.publicRepos) > 0) milestones.push({ title: `${profile.githubStats.publicRepos} public repositories`, detail: "GitHub portfolio active", icon: Github });
  if (activity.length > 1) { const latest = activity.at(-1); milestones.push({ title: "Latest verified activity", detail: `${Number(latest.total) || Number(latest.github) + Number(latest.leetcode) || 0} activities recorded`, date: latest.date, icon: Activity }); }
  return milestones.slice(0, 5);
}

function JourneyTimeline({ profile }) {
  const milestones = useMemo(() => buildMilestones(profile), [profile]);
  return (
    <Motion.section id="journey" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} className="scroll-mt-32 mt-6 rounded-lg bg-[#111c2e] p-5 md:p-6">
      <div className="flex items-start justify-between"><div><p className="text-xs font-extrabold uppercase text-orange-400">Journey timeline</p><h2 className="mt-1 text-xl font-black text-white">Milestones backed by your data</h2></div><GraduationCap size={21} className="text-orange-400" /></div>
      {milestones.length ? <div className="relative mt-7 flex flex-col gap-5 sm:flex-row sm:gap-3"><Motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="absolute bottom-2 left-[7px] top-2 w-px origin-top bg-orange-400/40 sm:left-2 sm:right-2 sm:top-[7px] sm:h-px sm:w-auto sm:origin-left sm:scale-y-100" />{milestones.map((milestone, index) => <Milestone key={`${milestone.title}-${index}`} milestone={milestone} index={index} />)}</div> : <div className="mt-6 rounded-lg bg-white/[.04] p-5"><p className="font-extrabold text-white">Your first milestone is ready to be recorded.</p><p className="mt-1 text-sm text-slate-400">Connect GitHub or LeetCode, or add a project, and verified progress will appear here.</p></div>}
    </Motion.section>
  );
}

function Milestone({ milestone, index }) {
  const Icon = milestone.icon || Flame;
  return <Motion.article initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="relative flex flex-1 gap-3 pl-7 sm:block sm:pl-0 sm:pt-7"><span className="absolute left-0 top-1 grid h-4 w-4 place-items-center rounded-full bg-orange-400 text-[#0b1220] sm:top-0"><Icon size={10} /></span><div><p className="text-sm font-black text-white">{milestone.title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{milestone.detail}</p>{milestone.date ? <time className="mt-1 block text-[10px] font-bold text-orange-300">{new Date(`${milestone.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time> : null}</div></Motion.article>;
}

function SkillsAndProjects({ profile, privacy, privacyState, onPrivacyChange, onEdit }) {
  const skills = profile.skills || [];
  const projects = profile.projectDetails || [];
  return (
    <section className="mt-6 grid gap-4 pb-8 lg:grid-cols-2">
      <details className="group rounded-lg bg-[#111c2e] p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase text-orange-400">Skills</p><h2 className="mt-1 text-lg font-black text-white">{skills.length} profile skills</h2></div><ChevronDown className="text-slate-400 transition group-open:rotate-180" size={18} /></summary>
        <div className="mt-5 border-t border-white/10 pt-4"><div className="flex justify-end"><PrivacySelect value={privacy.sections.skills ? "public" : "private"} onChange={(value) => onPrivacyChange("skills", value)} disabled={Boolean(privacyState.saving)} dark /></div>{skills.length ? <div className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <span key={skillName(skill)} className="rounded-md bg-white/[.06] px-2.5 py-1.5 text-xs font-bold text-slate-200">{skillName(skill)}{numeric(skill?.score) != null ? ` · ${skill.score}%` : ""}</span>)}</div> : <CompactEmpty title="Your skill graph is waiting." action="Add skills" onAction={onEdit} />}</div>
      </details>
      <details className="group rounded-lg bg-[#111c2e] p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase text-orange-400">Projects</p><h2 className="mt-1 text-lg font-black text-white">{profile.projects == null ? "Portfolio not recorded" : `${profile.projects} completed`}</h2></div><ChevronDown className="text-slate-400 transition group-open:rotate-180" size={18} /></summary>
        <div className="mt-5 border-t border-white/10 pt-4"><div className="flex justify-end"><PrivacySelect value={privacy.sections.projects ? "public" : "private"} onChange={(value) => onPrivacyChange("projects", value)} disabled={Boolean(privacyState.saving)} dark /></div>{projects.length ? <div className="mt-3 space-y-2">{projects.map((project, index) => <div key={project.name || project.title || index} className="rounded-md bg-white/[.05] p-3"><p className="font-extrabold text-white">{project.name || project.title || `Project ${index + 1}`}</p>{project.description ? <p className="mt-1 text-xs leading-5 text-slate-400">{project.description}</p> : null}</div>)}</div> : Number(profile.projects) > 0 ? <p className="mt-3 text-sm text-slate-400">Your project count is saved. Add project names or connect GitHub to show verified portfolio evidence.</p> : <CompactEmpty title="Build your project story." action="Add projects" onAction={onEdit} />}</div>
      </details>
    </section>
  );
}

function CompactEmpty({ title, action, onAction }) {
  return <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-white/[.04] p-3"><p className="text-sm font-bold text-slate-300">{title}</p><button type="button" onClick={onAction} className="shrink-0 text-xs font-extrabold text-orange-300">{action}</button></div>;
}

function DashboardSkeleton({ label }) {
  return <section className="min-h-80 rounded-lg bg-[#111c2e] p-6"><div className="animate-pulse space-y-4"><div className="h-4 w-36 rounded bg-white/10" /><div className="h-8 w-3/4 rounded bg-white/10" /><div className="h-40 rounded bg-white/5" /></div><p className="mt-5 text-sm text-slate-400">{label}</p></section>;
}
