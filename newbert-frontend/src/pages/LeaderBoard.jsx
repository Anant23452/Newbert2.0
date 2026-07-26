import { useState, useMemo } from "react";

// --- Mock Leaderboard Data with Streaks & Profiles ---
const MOCK_LEADERBOARD_USERS = [
  {
    id: "u1",
    name: "Aritra Pain",
    college: "AKTU Lucknow",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces",
    streakDays: 142,
    leetcodeSolved: 2659,
    gitCommits: 3200,
    skills: ["JavaScript", "React", "Node.js", "System Design"],
    bio: "Building full-stack apps & solving 2 DSA problems daily.",
  },
  {
    id: "u2",
    name: "Vaibhav Iramani",
    college: "AKTU Lucknow",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces",
    streakDays: 118,
    leetcodeSolved: 2031,
    gitCommits: 2890,
    skills: ["Java", "Spring Boot", "SQL", "DSA"],
    bio: "Focusing on backend engineering and microservices.",
  },
  {
    id: "u3",
    name: "Amay Singh",
    college: "IIT Kharagpur",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces",
    streakDays: 96,
    leetcodeSolved: 1947,
    gitCommits: 2450,
    skills: ["Python", "Machine Learning", "PyTorch", "C++"],
    bio: "AI enthusiast & competitive programmer.",
  },
  {
    id: "u4",
    name: "Sharon Antony M",
    college: "AKTU Lucknow",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces",
    streakDays: 84,
    leetcodeSolved: 1782,
    gitCommits: 1980,
    skills: ["React", "TypeScript", "TailwindCSS", "Next.js"],
    bio: "Frontend engineer building smooth UI components.",
  },
  {
    id: "u5",
    name: "Ramvignesh B",
    college: "VIT Vellore",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop&crop=faces",
    streakDays: 78,
    leetcodeSolved: 1894,
    gitCommits: 2100,
    skills: ["C++", "DSA", "Go", "Docker"],
    bio: "DevOps & cloud deployment practitioner.",
  },
  {
    id: "u6",
    name: "Harsh Saini",
    college: "AKTU Lucknow",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop&crop=faces",
    streakDays: 69,
    leetcodeSolved: 1513,
    gitCommits: 1850,
    skills: ["JavaScript", "Express", "MongoDB", "Git"],
    bio: "MERN stack learner building real-world projects.",
  },
  {
    id: "u7",
    name: "Rashmi Goplani",
    college: "DTU Delhi",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&crop=faces",
    streakDays: 62,
    leetcodeSolved: 1466,
    gitCommits: 1620,
    skills: ["Java", "DSA", "SQL", "React"],
    bio: "Preparing for product-based company placements.",
  },
  {
    id: "u8",
    name: "Aakash Mehta",
    college: "AKTU Lucknow",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop&crop=faces",
    streakDays: 55,
    leetcodeSolved: 1425,
    gitCommits: 1400,
    skills: ["C++", "DSA", "Git", "SQL"],
    bio: "Active Open Source contributor & LeetCode solver.",
  },
];

export default function Leaderboard() {
  // Read logged-in user profile from localStorage or default to AKTU Lucknow
  const [profile] = useState(() => JSON.parse(localStorage.getItem("newbert-profile") || '{"name":"You","college":"AKTU Lucknow"}'));
  const userCollege = profile?.college || "AKTU Lucknow";

  // --- States ---
  const [isGlobal, setIsGlobal] = useState(false); // Default to College-first!
  const [category, setCategory] = useState("streaks"); // 'streaks' | 'leetcode' | 'git'
  const [selectedUser, setSelectedUser] = useState(null); // Active user profile modal
  const [searchQuery, setSearchQuery] = useState("");

  // Filter students based on Scope (My College vs Global) and Search
  const filteredUsers = useMemo(() => {
    return MOCK_LEADERBOARD_USERS.filter((user) => {
      const matchCollege = !isGlobal ? user.college === userCollege : true;
      const matchSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCollege && matchSearch;
    });
  }, [isGlobal, userCollege, searchQuery]);

  // Ranked List for Streaks
  const streakRankings = useMemo(() => {
    return [...filteredUsers].sort((a, b) => b.streakDays - a.streakDays);
  }, [filteredUsers]);

  // Ranked List for LeetCode Solvers
  const leetcodeRankings = useMemo(() => {
    return [...filteredUsers].sort((a, b) => b.leetcodeSolved - a.leetcodeSolved);
  }, [filteredUsers]);

  // Ranked List for Git Contributors
  const gitRankings = useMemo(() => {
    return [...filteredUsers].sort((a, b) => b.gitCommits - a.gitCommits);
  }, [filteredUsers]);

  // Active top list for Podium calculation
  const activeList = category === "streaks" ? streakRankings : category === "leetcode" ? leetcodeRankings : gitRankings;

  return (
    <div className="min-h-screen bg-[#0D131E] text-slate-100 font-sans selection:bg-[#FF6B00] selection:text-white">
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
        {/* --- Header Section with Podium & Theme Colors --- */}
        <section className="relative overflow-hidden rounded-3xl border border-[#1E2B3E] bg-gradient-to-r from-[#121A28] via-[#151E2E] to-[#0D131E] p-6 md:p-8 shadow-2xl">
          {/* Subtle Orange Glow Ambient Effect */}
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#FF6B00]/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            {/* Title & Subtitle */}
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 text-3xl shadow-lg shadow-[#FF6B00]/10">
                🏆
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black md:text-3xl text-white tracking-tight">
                    Leaderboard Signal
                  </h1>
                  <span className="rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/40 px-3 py-0.5 text-[11px] font-black text-[#FF7A18] tracking-widest uppercase">
                    Live
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-400">
                  Showing rankings for{" "}
                  <strong className="text-[#FF7A18]">
                    {isGlobal ? "All Colleges (Global)" : userCollege}
                  </strong>
                </p>
              </div>
            </div>

            {/* Top 3 Visual Podium (Clickable) */}
            <div className="flex items-end justify-center gap-3 pt-2 md:pt-0">
              {/* Rank #2 Podium */}
              {activeList[1] && (
                <div onClick={() => setSelectedUser(activeList[1])} className="group cursor-pointer flex flex-col items-center transition-transform hover:-translate-y-1">
                  <img src={activeList[1].avatar} alt={activeList[1].name} className="h-10 w-10 rounded-full border-2 border-slate-300 object-cover shadow-md group-hover:border-[#FF6B00]" />
                  <span className="mt-1 text-[11px] font-bold text-slate-300 max-w-[70px] truncate">{activeList[1].name}</span>
                  <div className="mt-1 flex h-11 w-14 items-center justify-center rounded-t-xl border-t-2 border-slate-300 bg-[#1A2436] font-black text-slate-300 text-sm shadow-md">
                    2
                  </div>
                </div>
              )}

              {/* Rank #1 Podium with Crown */}
              {activeList[0] && (
                <div onClick={() => setSelectedUser(activeList[0])} className="group cursor-pointer flex flex-col items-center -mt-4 transition-transform hover:-translate-y-1">
                  <span className="text-base leading-none text-[#FF6B00]">👑</span>
                  <img src={activeList[0].avatar} alt={activeList[0].name} className="h-12 w-12 rounded-full border-2 border-[#FF6B00] object-cover shadow-xl ring-4 ring-[#FF6B00]/30" />
                  <span className="mt-1 text-[11px] font-black text-[#FF7A18] max-w-[80px] truncate">{activeList[0].name}</span>
                  <div className="mt-1 flex h-16 w-16 items-center justify-center rounded-t-xl border-t-2 border-[#FF6B00] bg-gradient-to-b from-[#FF6B00]/25 to-[#1A2436] font-black text-[#FF7A18] text-lg shadow-xl shadow-[#FF6B00]/10">
                    1
                  </div>
                </div>
              )}

              {/* Rank #3 Podium */}
              {activeList[2] && (
                <div onClick={() => setSelectedUser(activeList[2])} className="group cursor-pointer flex flex-col items-center transition-transform hover:-translate-y-1">
                  <img src={activeList[2].avatar} alt={activeList[2].name} className="h-10 w-10 rounded-full border-2 border-amber-700 object-cover shadow-md group-hover:border-[#FF6B00]" />
                  <span className="mt-1 text-[11px] font-bold text-amber-600 max-w-[70px] truncate">{activeList[2].name}</span>
                  <div className="mt-1 flex h-9 w-14 items-center justify-center rounded-t-xl border-t-2 border-amber-700 bg-[#1A2436] font-black text-amber-600 text-sm shadow-md">
                    3
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* --- Top Controls: College vs Global Scope & Category Switcher --- */}
        <section className="flex flex-wrap items-center justify-between gap-4">
          {/* Main Scope Switcher (College-First vs Global) */}
          <div className="flex items-center rounded-2xl border border-[#1E2B3E] bg-[#121926] p-1.5 shadow-lg">
            <button
              onClick={() => setIsGlobal(false)}
              className={`rounded-xl px-5 py-2.5 text-xs font-black transition-all ${
                !isGlobal
                  ? "bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🏫 {userCollege}
            </button>
            <button
              onClick={() => setIsGlobal(true)}
              className={`rounded-xl px-5 py-2.5 text-xs font-black transition-all ${
                isGlobal
                  ? "bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🌐 Global All Colleges
            </button>
          </div>

          {/* Category Tabs & Search Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Switcher */}
            <div className="flex rounded-2xl border border-[#1E2B3E] bg-[#121926] p-1.5">
              <button
                onClick={() => setCategory("streaks")}
                className={`rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                  category === "streaks"
                    ? "bg-[#FF6B00]/20 text-[#FF7A18] border border-[#FF6B00]/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🔥 Active Streaks
              </button>
              <button
                onClick={() => setCategory("leetcode")}
                className={`rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                  category === "leetcode"
                    ? "bg-[#FF6B00]/20 text-[#FF7A18] border border-[#FF6B00]/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🧩 LeetCode
              </button>
              <button
                onClick={() => setCategory("git")}
                className={`rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                  category === "git"
                    ? "bg-[#FF6B00]/20 text-[#FF7A18] border border-[#FF6B00]/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🐙 Git Commits
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-2xl border border-[#1E2B3E] bg-[#121926] px-4 py-2 text-xs font-medium text-slate-100 placeholder-slate-500 focus:border-[#FF6B00] focus:outline-none"
            />
          </div>
        </section>

        {/* --- Leaderboards Section --- */}
        <section className="grid gap-6">
          {/* 🔥 STREAK LEADERBOARD */}
          {(category === "streaks" || category === "all") && (
            <div className="rounded-3xl border border-[#1E2B3E] bg-[#121926] p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#1E2B3E]">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="text-[#FF6B00]">🔥</span> Daily Rhythm & Streak Leaders
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Students with longest continuous daily coding streak ({!isGlobal ? userCollege : "Global"})
                  </p>
                </div>
                <span className="text-xs font-extrabold text-[#FF7A18] bg-[#FF6B00]/10 px-3 py-1 rounded-full border border-[#FF6B00]/30">
                  {streakRankings.length} Students
                </span>
              </div>

              {/* Clean Cards Grid (Clickable to open profile) */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {streakRankings.map((user, idx) => (
                  <CleanUserCard
                    key={user.id}
                    rank={idx + 1}
                    user={user}
                    badgeText={`${user.streakDays} days`}
                    badgeIcon="🔥"
                    onClick={() => setSelectedUser(user)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 🧩 LEETCODE LEADERBOARD */}
          {category === "leetcode" && (
            <div className="rounded-3xl border border-[#1E2B3E] bg-[#121926] p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#1E2B3E]">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="text-[#FF6B00]">🧩</span> Top LeetCode Solvers
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Most problems solved on LeetCode</p>
                </div>
                <span className="text-xs font-extrabold text-[#FF7A18] bg-[#FF6B00]/10 px-3 py-1 rounded-full border border-[#FF6B00]/30">
                  {leetcodeRankings.length} Solvers
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {leetcodeRankings.map((user, idx) => (
                  <CleanUserCard
                    key={user.id}
                    rank={idx + 1}
                    user={user}
                    badgeText={`${user.leetcodeSolved} solved`}
                    badgeIcon="✓"
                    onClick={() => setSelectedUser(user)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 🐙 GIT LEADERBOARD */}
          {category === "git" && (
            <div className="rounded-3xl border border-[#1E2B3E] bg-[#121926] p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#1E2B3E]">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="text-[#FF6B00]">🐙</span> Top Git Contributors
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Most public Git commits made</p>
                </div>
                <span className="text-xs font-extrabold text-[#FF7A18] bg-[#FF6B00]/10 px-3 py-1 rounded-full border border-[#FF6B00]/30">
                  {gitRankings.length} Contributors
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {gitRankings.map((user, idx) => (
                  <CleanUserCard
                    key={user.id}
                    rank={idx + 1}
                    user={user}
                    badgeText={`${user.gitCommits} commits`}
                    badgeIcon="⎇"
                    onClick={() => setSelectedUser(user)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* --- Student Profile Quick View Modal --- */}
      {selectedUser && (
        <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}

// --- Clean Minimal User Item Card (College Hidden for Clean UI) ---
function CleanUserCard({ rank, user, badgeText, badgeIcon, onClick }) {
  const isTop1 = rank === 1;
  const isTop2 = rank === 2;
  const isTop3 = rank === 3;

  const rankBadgeStyle = isTop1
    ? "bg-[#FF6B00] text-white ring-2 ring-[#FF6B00]/50 shadow-md font-black"
    : isTop2
    ? "bg-slate-300 text-slate-950 font-black"
    : isTop3
    ? "bg-amber-700 text-white font-black"
    : "bg-[#1E2B3E] text-slate-400 font-bold border border-slate-700";

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer ${
        isTop1
          ? "border-[#FF6B00]/50 bg-gradient-to-r from-[#FF6B00]/15 to-[#1A2436] shadow-lg shadow-[#FF6B00]/5 hover:border-[#FF6B00]"
          : "border-[#1E2B3E] bg-[#162030] hover:border-slate-700 hover:bg-[#1A263A]"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Rank Circle */}
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs ${rankBadgeStyle}`}>
          {rank}
        </div>

        {/* User Avatar */}
        <img
          src={user.avatar}
          alt={user.name}
          className="h-10 w-10 shrink-0 rounded-full object-cover border border-slate-600 group-hover:border-[#FF6B00] transition-colors"
        />

        {/* Name Only (Clean Layout - College Hidden in list) */}
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-white group-hover:text-[#FF7A18] transition-colors">
            {user.name}
          </p>
        </div>
      </div>

      {/* Score / Streak Badge */}
      <div className="shrink-0 text-right">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/15 px-3 py-1 text-xs font-black text-[#FF7A18]">
          <span>{badgeIcon}</span> {badgeText}
        </span>
      </div>
    </div>
  );
}

// --- Student Profile Modal (Opens on User Click) ---
function UserProfileModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#1E2B3E] bg-[#121926] p-6 shadow-2xl text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-[#1E2B3E] text-slate-400 hover:text-white transition"
        >
          ✕
        </button>

        {/* User Header Info */}
        <div className="flex items-center gap-4">
          <img src={user.avatar} alt={user.name} className="h-16 w-16 rounded-full object-cover border-2 border-[#FF6B00] shadow-lg" />
          <div>
            <h3 className="text-xl font-black text-white">{user.name}</h3>
            {/* College Name Displayed here inside modal */}
            <p className="text-xs font-extrabold text-[#FF7A18] mt-0.5">🏫 {user.college}</p>
          </div>
        </div>

        {/* User Bio */}
        {user.bio && (
          <p className="mt-4 text-xs leading-relaxed text-slate-300 border-t border-[#1E2B3E] pt-3">
            {user.bio}
          </p>
        )}

        {/* Stats Grid */}
        <div className="mt-5 grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-2xl border border-[#1E2B3E] bg-[#162030] p-3">
            <p className="text-[10px] font-extrabold uppercase text-slate-400">Streak</p>
            <p className="mt-1 text-base font-black text-[#FF7A18]">🔥 {user.streakDays}d</p>
          </div>
          <div className="rounded-2xl border border-[#1E2B3E] bg-[#162030] p-3">
            <p className="text-[10px] font-extrabold uppercase text-slate-400">LeetCode</p>
            <p className="mt-1 text-base font-black text-amber-400">✓ {user.leetcodeSolved}</p>
          </div>
          <div className="rounded-2xl border border-[#1E2B3E] bg-[#162030] p-3">
            <p className="text-[10px] font-extrabold uppercase text-slate-400">Git</p>
            <p className="mt-1 text-base font-black text-sky-400">⎇ {user.gitCommits}</p>
          </div>
        </div>

        {/* Detected Skills */}
        <div className="mt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Skills Signal</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {user.skills.map((skill) => (
              <span key={skill} className="rounded-lg border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-2.5 py-1 text-[11px] font-bold text-[#FF7A18]">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[#FF6B00] py-2.5 text-xs font-black text-white shadow-lg shadow-[#FF6B00]/30 hover:bg-[#FF7A18] transition"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}