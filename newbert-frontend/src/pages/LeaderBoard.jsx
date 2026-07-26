import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

// --- Mock Leaderboard Data with College Differentiators ---
const MOCK_LEETCODE_USERS = [
  { rank: 1, name: "Aritra Pain", college: "IIT Kharagpur", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces", solved7d: 122, solved30d: 410, solvedAll: 2659 },
  { rank: 2, name: "Vaibhav Iramani", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces", solved7d: 114, solved30d: 380, solvedAll: 2031 },
  { rank: 3, name: "Amay Singh", college: "DTU Delhi", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces", solved7d: 104, solved30d: 345, solvedAll: 1947 },
  { rank: 4, name: "Ramvignesh B", college: "VIT Vellore", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop&crop=faces", solved7d: 97, solved30d: 310, solvedAll: 1894 },
  { rank: 5, name: "Sharon Antony M", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces", solved7d: 87, solved30d: 290, solvedAll: 1782 },
  { rank: 6, name: "Harsh Saini", college: "BITS Pilani", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=faces", solved7d: 81, solved30d: 260, solvedAll: 1513 },
  { rank: 7, name: "Rashmi Goplani", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=faces", solved7d: 80, solved30d: 240, solvedAll: 1466 },
  { rank: 8, name: "Aakash Mehta", college: "IIT Bombay", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&crop=faces", solved7d: 73, solved30d: 220, solvedAll: 1425 },
  { rank: 9, name: "Vartul Pandey", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=faces", solved7d: 71, solved30d: 210, solvedAll: 1345 },
  { rank: 10, name: "Kiran Kumar", college: "SRM Chennai", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces", solved7d: 69, solved30d: 195, solvedAll: 1330 },
];

const MOCK_GIT_USERS = [
  { rank: 1, name: "Anoop Raju", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces", commits7d: 229, commits30d: 740, commitsAll: 3200 },
  { rank: 2, name: "Rakshith Bhat", college: "IIT Delhi", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces", commits7d: 184, commits30d: 610, commitsAll: 2890 },
  { rank: 3, name: "Anant Kumar", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces", commits7d: 156, commits30d: 520, commitsAll: 2450 },
  { rank: 4, name: "Akkal Dhami", college: "VIT Vellore", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop&crop=faces", commits7d: 137, commits30d: 460, commitsAll: 2100 },
  { rank: 5, name: "Rohit Kumar", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=faces", commits7d: 127, commits30d: 410, commitsAll: 1980 },
  { rank: 6, name: "Ashish Nadadd...", college: "BITS Pilani", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&crop=faces", commits7d: 124, commits30d: 390, commitsAll: 1850 },
  { rank: 7, name: "Vikash Sharma", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=faces", commits7d: 110, commits30d: 350, commitsAll: 1620 },
  { rank: 8, name: "Tina Benita R...", college: "DTU Delhi", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces", commits7d: 93, commits30d: 310, commitsAll: 1400 },
  { rank: 9, name: "Satish Jhanwer", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces", commits7d: 88, commits30d: 280, commitsAll: 1290 },
  { rank: 10, name: "Agrim Gupta", college: "IIT Bombay", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=faces", commits7d: 81, commits30d: 260, commitsAll: 1150 },
];

// --- Mock Streak Leaderboard Data (current + longest daily practice streak) ---
const MOCK_STREAK_USERS = [
  { rank: 1, name: "Anoop Raju", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces", currentStreak: 63, longestStreak: 71 },
  { rank: 2, name: "Aritra Pain", college: "IIT Kharagpur", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces", currentStreak: 54, longestStreak: 60 },
  { rank: 3, name: "Anant Kumar", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces", currentStreak: 48, longestStreak: 52 },
  { rank: 4, name: "Vaibhav Iramani", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop&crop=faces", currentStreak: 41, longestStreak: 49 },
  { rank: 5, name: "Rakshith Bhat", college: "IIT Delhi", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=faces", currentStreak: 37, longestStreak: 44 },
  { rank: 6, name: "Sharon Antony M", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=faces", currentStreak: 33, longestStreak: 40 },
  { rank: 7, name: "Amay Singh", college: "DTU Delhi", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&crop=faces", currentStreak: 29, longestStreak: 35 },
  { rank: 8, name: "Vikash Sharma", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=faces", currentStreak: 24, longestStreak: 31 },
  { rank: 9, name: "Ramvignesh B", college: "VIT Vellore", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces", currentStreak: 19, longestStreak: 27 },
  { rank: 10, name: "Rashmi Goplani", college: "AKTU Lucknow", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces", currentStreak: 15, longestStreak: 22 },
];

const COLLEGES_LIST = ["All Colleges", "AKTU Lucknow", "IIT Kharagpur", "IIT Delhi", "IIT Bombay", "DTU Delhi", "VIT Vellore", "BITS Pilani", "SRM Chennai"];

export default function Leaderboard() {
  // --- States ---
  const [profile] = useState(() => JSON.parse(localStorage.getItem("newbert-profile") || '{"name":"You","college":"AKTU Lucknow"}'));
  const [scope, setScope] = useState("global"); // 'global' | 'myCollege'
  const [selectedCollege, setSelectedCollege] = useState("All Colleges");
  const [platformView, setPlatformView] = useState("both"); // 'both' | 'leetcode' | 'git'
  const [timeframe, setTimeframe] = useState("7d"); // '7d' | '30d' | 'all'
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(true); // Default to NamasteDev dark theme

  // Handle college scope toggle
  const userCollege = profile?.college || "AKTU Lucknow";
  const activeCollegeFilter = scope === "myCollege" ? userCollege : selectedCollege;

  // Filter & Sort Streak Data
  const filteredStreaks = useMemo(() => {
    return MOCK_STREAK_USERS.filter((u) => {
      const matchCollege = activeCollegeFilter === "All Colleges" || u.college === activeCollegeFilter;
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.college.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCollege && matchSearch;
    })
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .map((u, index) => ({ ...u, dynamicRank: index + 1 }));
  }, [activeCollegeFilter, searchQuery]);

  // Filter & Sort LeetCode Data
  const filteredLeetcode = useMemo(() => {
    return MOCK_LEETCODE_USERS.filter((u) => {
      const matchCollege = activeCollegeFilter === "All Colleges" || u.college === activeCollegeFilter;
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.college.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCollege && matchSearch;
    })
      .map((u) => ({
        ...u,
        score: timeframe === "7d" ? u.solved7d : timeframe === "30d" ? u.solved30d : u.solvedAll,
      }))
      .sort((a, b) => b.score - a.score)
      .map((u, index) => ({ ...u, dynamicRank: index + 1 }));
  }, [activeCollegeFilter, timeframe, searchQuery]);

  // Filter & Sort Git Data
  const filteredGit = useMemo(() => {
    return MOCK_GIT_USERS.filter((u) => {
      const matchCollege = activeCollegeFilter === "All Colleges" || u.college === activeCollegeFilter;
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.college.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCollege && matchSearch;
    })
      .map((u) => ({
        ...u,
        score: timeframe === "7d" ? u.commits7d : timeframe === "30d" ? u.commits30d : u.commitsAll,
      }))
      .sort((a, b) => b.score - a.score)
      .map((u, index) => ({ ...u, dynamicRank: index + 1 }));
  }, [activeCollegeFilter, timeframe, searchQuery]);

  // User rank mock
  const userLeetcodeRank = { rank: scope === "myCollege" ? 12 : 34, score: timeframe === "7d" ? 39 : 237 };
  const userGitRank = { rank: scope === "myCollege" ? 1 : 3, score: timeframe === "7d" ? 156 : 480 };
  const userStreakRank = { rank: scope === "myCollege" ? 2 : 8, current: 21, longest: 34 };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-[#0b0c0e] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* --- Top Header Banner with Top 3 Podium (Matching Image 3) --- */}
        <section className={`relative overflow-hidden rounded-2xl border p-6 md:p-8 shadow-xl transition-all ${darkMode ? "border-amber-500/20 bg-gradient-to-r from-[#14161a] via-[#1a1c22] to-[#121317]" : "border-orange-200 bg-gradient-to-r from-orange-50 via-white to-amber-50"}`}>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            {/* Title Block */}
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-500/20 text-2xl border border-orange-500/40">
                🏆
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black md:text-3xl text-amber-500">Leaderboard</h1>
                  <span className="rounded-full bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 text-[11px] font-extrabold text-orange-400 uppercase tracking-wider">Live Signal</span>
                </div>
                <p className={`mt-1 text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                  See who's leading the way on Newbert today {scope === "myCollege" ? `at ${userCollege}` : "globally"}
                </p>
              </div>
            </div>

            {/* Top 3 Podium Visual (Matching Image 3) */}
            <div className="flex items-end justify-center gap-3 pt-2 md:pt-0">
              {/* #2 Silver Podium */}
              <div className="flex flex-col items-center">
                <img src={filteredLeetcode[1]?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"} alt="Rank 2" className="h-9 w-9 rounded-full border-2 border-slate-300 object-cover shadow-md" />
                <span className="mt-1 text-[11px] font-bold text-slate-300 max-w-[65px] truncate">{filteredLeetcode[1]?.name || "Aditya"}</span>
                <div className={`mt-1 flex h-12 w-14 items-center justify-center rounded-t-lg border-t-2 border-slate-300 font-black text-slate-300 text-sm ${darkMode ? "bg-slate-800/80" : "bg-slate-200"}`}>
                  2
                </div>
              </div>

              {/* #1 Gold Podium with Crown */}
              <div className="flex flex-col items-center -mt-4">
                <span className="text-sm leading-none text-amber-400">👑</span>
                <img src={filteredLeetcode[0]?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} alt="Rank 1" className="h-11 w-11 rounded-full border-2 border-amber-400 object-cover shadow-lg ring-2 ring-amber-400/50" />
                <span className="mt-1 text-[11px] font-black text-amber-400 max-w-[75px] truncate">{filteredLeetcode[0]?.name || "Satish"}</span>
                <div className={`mt-1 flex h-16 w-16 items-center justify-center rounded-t-lg border-t-2 border-amber-400 font-black text-amber-400 text-base shadow-lg ${darkMode ? "bg-amber-500/20" : "bg-amber-100"}`}>
                  1
                </div>
              </div>

              {/* #3 Bronze Podium */}
              <div className="flex flex-col items-center">
                <img src={filteredLeetcode[2]?.avatar || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100"} alt="Rank 3" className="h-9 w-9 rounded-full border-2 border-amber-700 object-cover shadow-md" />
                <span className="mt-1 text-[11px] font-bold text-amber-600 max-w-[65px] truncate">{filteredLeetcode[2]?.name || "Akshay"}</span>
                <div className={`mt-1 flex h-9 w-14 items-center justify-center rounded-t-lg border-t-2 border-amber-700 font-black text-amber-600 text-sm ${darkMode ? "bg-amber-950/60" : "bg-amber-200"}`}>
                  3
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- Upper Controls Bar: Dual Toggles, Timeframe, College Filter --- */}
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4">
          {/* Left Dual Toggles */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Toggle: Global vs My College */}
            <div className={`flex rounded-xl p-1 border ${darkMode ? "border-slate-800 bg-[#121418]" : "border-slate-200 bg-white"}`}>
              <button
                onClick={() => setScope("global")}
                className={`rounded-lg px-4 py-2 text-xs font-extrabold transition-all ${scope === "global" ? "bg-amber-500 text-slate-950 shadow-md" : darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"}`}
              >
                🌐 Global
              </button>
              <button
                onClick={() => setScope("myCollege")}
                className={`rounded-lg px-4 py-2 text-xs font-extrabold transition-all ${scope === "myCollege" ? "bg-amber-500 text-slate-950 shadow-md" : darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"}`}
              >
                🏫 My College ({userCollege})
              </button>
            </div>

            {/* View Toggle: Both vs LeetCode vs Git */}
            <div className={`flex rounded-xl p-1 border ${darkMode ? "border-slate-800 bg-[#121418]" : "border-slate-200 bg-white"}`}>
              <button
                onClick={() => setPlatformView("both")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${platformView === "both" ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" : darkMode ? "text-slate-400" : "text-slate-600"}`}
              >
                📊 Both
              </button>
              <button
                onClick={() => setPlatformView("leetcode")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${platformView === "leetcode" ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" : darkMode ? "text-slate-400" : "text-slate-600"}`}
              >
                🧩 LeetCode
              </button>
              <button
                onClick={() => setPlatformView("git")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${platformView === "git" ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" : darkMode ? "text-slate-400" : "text-slate-600"}`}
              >
                🐙 Git
              </button>
            </div>
          </div>

          {/* Right Controls: College Dropdown, Timeframe, Search, Theme Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* College Filter Dropdown (When in Global Scope) */}
            {scope === "global" && (
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold focus:outline-none ${darkMode ? "border-slate-800 bg-[#121418] text-slate-200 focus:border-amber-500" : "border-slate-300 bg-white text-slate-900"}`}
              >
                {COLLEGES_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Timeframe Selector */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold focus:outline-none ${darkMode ? "border-slate-800 bg-[#121418] text-slate-200 focus:border-amber-500" : "border-slate-300 bg-white text-slate-900"}`}
            >
              <option value="7d">Past 7 Days</option>
              <option value="30d">Past 30 Days</option>
              <option value="all">All Time</option>
            </select>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search student or college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none ${darkMode ? "border-slate-800 bg-[#121418] text-slate-200 placeholder-slate-500 focus:border-amber-500" : "border-slate-300 bg-white text-slate-900 placeholder-slate-400"}`}
            />

            {/* Dark/Light Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`rounded-xl border p-2 text-xs font-bold transition ${darkMode ? "border-slate-800 bg-[#121418] text-amber-400" : "border-slate-300 bg-white text-slate-700"}`}
              title="Toggle Theme"
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
        </section>

        {/* ================= STREAK LEADERBOARD (NEW — sits above the other two lists) ================= */}
        <section className={`mt-6 rounded-2xl border p-6 shadow-md transition ${darkMode ? "border-slate-800/80 bg-[#121418]" : "border-slate-200 bg-white"}`}>
          {/* Leaderboard Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-amber-500">
                <span>🔥</span> Streak Leaderboard
              </h2>
              <p className={`mt-0.5 text-xs ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                Longest active daily-practice streaks across GitHub + LeetCode combined.
              </p>
            </div>
            <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-extrabold text-amber-400">
              Current Streak
            </span>
          </div>

          {/* Your Rank Card */}
          <div className={`mt-5 flex items-center justify-between rounded-xl border p-4 shadow-sm ${darkMode ? "border-amber-500/30 bg-amber-500/5 text-slate-100" : "border-amber-200 bg-amber-50/80 text-slate-900"}`}>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-lg border border-amber-500/40">
                🔥
              </div>
              <div>
                <p className={`text-[11px] font-extrabold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Your Rank</p>
                <p className="text-xl font-black text-amber-500">
                  #{userStreakRank.rank} <span className="text-xs font-bold text-slate-400">out of all learners</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className={`text-[11px] font-extrabold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Current / Longest</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-400">
                🔥 {userStreakRank.current} days / 🏅 {userStreakRank.longest} days
              </span>
            </div>
          </div>

          {/* Streak Cards Grid — compact row, 5 across on desktop */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {filteredStreaks.map((user) => (
              <UserStreakCard key={user.name} user={user} darkMode={darkMode} />
            ))}
          </div>
        </section>

        {/* --- Main Leaderboards Grid --- */}
        <div className={`mt-6 grid gap-6 ${platformView === "both" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* ================= LEETCODE LEADERBOARD ================= */}
          {(platformView === "both" || platformView === "leetcode") && (
            <section className={`rounded-2xl border p-6 shadow-md transition ${darkMode ? "border-slate-800/80 bg-[#121418]" : "border-slate-200 bg-white"}`}>
              {/* Leaderboard Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black text-amber-500">
                    <span>👑</span> Top LeetCode Solvers {timeframe === "all" ? "(All Time)" : ""}
                  </h2>
                  <p className={`mt-0.5 text-xs ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Users with most LeetCode solutions. <span className="text-amber-500 underline cursor-pointer">Connect LeetCode</span>
                  </p>
                </div>
                <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-extrabold text-amber-400">
                  {timeframe === "7d" ? "Past 7 Days" : timeframe === "30d" ? "Past 30 Days" : "All Time"}
                </span>
              </div>

              {/* Your Rank Card (Matching Image 1 & 2) */}
              <div className={`mt-5 flex items-center justify-between rounded-xl border p-4 shadow-sm ${darkMode ? "border-amber-500/30 bg-amber-500/5 text-slate-100" : "border-amber-200 bg-amber-50/80 text-slate-900"}`}>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-lg border border-amber-500/40">
                    🏆
                  </div>
                  <div>
                    <p className={`text-[11px] font-extrabold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Your Rank</p>
                    <p className="text-xl font-black text-amber-500">
                      #{userLeetcodeRank.rank} <span className="text-xs font-bold text-slate-400">out of all learners</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-[11px] font-extrabold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Solved {timeframe === "7d" ? "Past 7 Days" : timeframe === "30d" ? "Past 30 Days" : "All Time"}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-400">
                    ✓ {userLeetcodeRank.score} questions
                  </span>
                </div>
              </div>

              {/* Leaderboard Cards Grid (2 Columns, matching Images 1 & 2) */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {filteredLeetcode.map((user) => (
                  <UserRankCard key={user.name} user={user} metricLabel="solved" darkMode={darkMode} />
                ))}
              </div>
            </section>
          )}

          {/* ================= GIT LEADERBOARD ================= */}
          {(platformView === "both" || platformView === "git") && (
            <section className={`rounded-2xl border p-6 shadow-md transition ${darkMode ? "border-slate-800/80 bg-[#121418]" : "border-slate-200 bg-white"}`}>
              {/* Leaderboard Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black text-amber-500">
                    <span>👑</span> Top Git Contributors {timeframe === "all" ? "(All Time)" : ""}
                  </h2>
                  <p className={`mt-0.5 text-xs ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Users with most Git contributions. <span className="text-amber-500 underline cursor-pointer">Connect GitHub</span>
                  </p>
                </div>
                <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-extrabold text-amber-400">
                  {timeframe === "7d" ? "Past 7 Days" : timeframe === "30d" ? "Past 30 Days" : "All Time"}
                </span>
              </div>

              {/* Your Rank Card (Matching Image 1) */}
              <div className={`mt-5 flex items-center justify-between rounded-xl border p-4 shadow-sm ${darkMode ? "border-amber-500/30 bg-amber-500/5 text-slate-100" : "border-amber-200 bg-amber-50/80 text-slate-900"}`}>
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg border ${darkMode ? "border-slate-700 bg-slate-800" : "border-slate-300 bg-slate-200"}`}>
                    🐙
                  </div>
                  <div>
                    <p className={`text-[11px] font-extrabold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Your Rank</p>
                    <p className="text-xl font-black text-amber-500">
                      #{userGitRank.rank} <span className="text-xs font-bold text-slate-400">out of all learners</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-[11px] font-extrabold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Commits {timeframe === "7d" ? "Past 7 Days" : timeframe === "30d" ? "Past 30 Days" : "All Time"}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-400">
                    ⎇ {userGitRank.score} commits
                  </span>
                </div>
              </div>

              {/* Leaderboard Cards Grid (2 Columns, matching Images 1 & 2) */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {filteredGit.map((user) => (
                  <UserRankCard key={user.name} user={user} metricLabel="commits" darkMode={darkMode} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// --- Individual User Rank Card Component ---
function UserRankCard({ user, metricLabel, darkMode }) {
  const isTop1 = user.dynamicRank === 1;
  const isTop2 = user.dynamicRank === 2;
  const isTop3 = user.dynamicRank === 3;

  // Rank badge styling
  const rankBadgeStyle = isTop1
    ? "bg-amber-500 text-slate-950 ring-2 ring-amber-400/50 shadow-md font-black"
    : isTop2
    ? "bg-slate-300 text-slate-950 font-black"
    : isTop3
    ? "bg-amber-700 text-white font-black"
    : darkMode
    ? "bg-slate-800 text-slate-400 font-bold border border-slate-700"
    : "bg-slate-200 text-slate-700 font-bold";

  return (
    <div
      className={`group flex items-center justify-between rounded-xl border p-3 transition-all duration-200 ${
        isTop1
          ? darkMode
            ? "border-amber-500/50 bg-amber-500/10 shadow-md shadow-amber-500/5"
            : "border-amber-300 bg-amber-50/90 shadow-sm"
          : darkMode
          ? "border-slate-800/80 bg-[#181a20] hover:border-slate-700"
          : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Rank Circle Badge */}
        <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${rankBadgeStyle}`}>
          {user.dynamicRank}
        </div>

        {/* Avatar */}
        <img src={user.avatar} alt={user.name} className="h-8 w-8 shrink-0 rounded-full object-cover border border-slate-500/30" />

        {/* User Info & College Badge */}
        <div className="min-w-0">
          <p className={`truncate text-xs font-extrabold ${darkMode ? "text-slate-100 group-hover:text-amber-400" : "text-slate-900 group-hover:text-amber-600"}`}>
            {user.name}
          </p>
          <span className={`inline-block truncate text-[10px] font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            {user.college}
          </span>
        </div>
      </div>

      {/* Score Metric */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-black text-amber-500 leading-tight">{user.score.toLocaleString()}</p>
        <p className={`text-[10px] font-bold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{metricLabel}</p>
      </div>
    </div>
  );
}

// --- Individual User Streak Card Component (compact, orange/amber theme) ---
function UserStreakCard({ user, darkMode }) {
  const isTop1 = user.dynamicRank === 1;
  const isTop2 = user.dynamicRank === 2;
  const isTop3 = user.dynamicRank === 3;

  const rankBadgeStyle = isTop1
    ? "bg-amber-500 text-slate-950 ring-2 ring-amber-400/50 shadow-md font-black"
    : isTop2
    ? "bg-slate-300 text-slate-950 font-black"
    : isTop3
    ? "bg-amber-700 text-white font-black"
    : darkMode
    ? "bg-slate-800 text-slate-400 font-bold border border-slate-700"
    : "bg-slate-200 text-slate-700 font-bold";

  return (
    <div
      className={`group flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-200 ${
        isTop1
          ? darkMode
            ? "border-amber-500/50 bg-amber-500/10 shadow-md shadow-amber-500/5"
            : "border-amber-300 bg-amber-50/90 shadow-sm"
          : darkMode
          ? "border-slate-800/80 bg-[#181a20] hover:border-slate-700"
          : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
      }`}
    >
      <div className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${rankBadgeStyle}`}>{user.dynamicRank}</div>
      <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full object-cover border border-slate-500/30" />
      <p className={`w-full truncate text-xs font-extrabold ${darkMode ? "text-slate-100 group-hover:text-amber-400" : "text-slate-900 group-hover:text-amber-600"}`}>
        {user.name}
      </p>
      <span className={`w-full truncate text-[10px] font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{user.college}</span>
      <p className="mt-0.5 text-base font-black text-amber-500 leading-none">🔥 {user.currentStreak}</p>
      <p className={`text-[10px] font-bold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>best {user.longestStreak}d</p>
    </div>
  );
}