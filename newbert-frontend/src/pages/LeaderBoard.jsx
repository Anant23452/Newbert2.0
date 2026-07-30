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
  const [profile] = useState(() => JSON.parse(localStorage.getItem("newbert-profile") || '{"name":"You","college":""}'));
  const hasRegisteredCollege = Boolean(profile?.college);
  const userCollege = profile?.college || "AKTU Lucknow";

  // If the student has registered a college, default to seeing their college's ranks everywhere.
  // Switching to Global shows every learner who has signed up to Newbert, no college filter.
  const [scope, setScope] = useState(hasRegisteredCollege ? "myCollege" : "global");
  const [selectedCollege, setSelectedCollege] = useState("All Colleges");
  const [platformView, setPlatformView] = useState("both"); // 'both' | 'leetcode' | 'git'
  const [searchQuery, setSearchQuery] = useState("");

  // Timeframe is now independent per section, not one control for the whole page.
  const [leetcodeTimeframe, setLeetcodeTimeframe] = useState("7d"); // '7d' | '30d' | 'all'
  const [gitTimeframe, setGitTimeframe] = useState("7d"); // '7d' | '30d' | 'all'

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

  // Filter & Sort LeetCode Data (own timeframe)
  const filteredLeetcode = useMemo(() => {
    return MOCK_LEETCODE_USERS.filter((u) => {
      const matchCollege = activeCollegeFilter === "All Colleges" || u.college === activeCollegeFilter;
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.college.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCollege && matchSearch;
    })
      .map((u) => ({
        ...u,
        score: leetcodeTimeframe === "7d" ? u.solved7d : leetcodeTimeframe === "30d" ? u.solved30d : u.solvedAll,
      }))
      .sort((a, b) => b.score - a.score)
      .map((u, index) => ({ ...u, dynamicRank: index + 1 }));
  }, [activeCollegeFilter, leetcodeTimeframe, searchQuery]);

  // Filter & Sort Git Data (own timeframe)
  const filteredGit = useMemo(() => {
    return MOCK_GIT_USERS.filter((u) => {
      const matchCollege = activeCollegeFilter === "All Colleges" || u.college === activeCollegeFilter;
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.college.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCollege && matchSearch;
    })
      .map((u) => ({
        ...u,
        score: gitTimeframe === "7d" ? u.commits7d : gitTimeframe === "30d" ? u.commits30d : u.commitsAll,
      }))
      .sort((a, b) => b.score - a.score)
      .map((u, index) => ({ ...u, dynamicRank: index + 1 }));
  }, [activeCollegeFilter, gitTimeframe, searchQuery]);

  // User rank mock — each field's "Your Rank" reflects the active scope (college vs global)
  const userLeetcodeRank = { rank: scope === "myCollege" ? 12 : 34, score: leetcodeTimeframe === "7d" ? 39 : leetcodeTimeframe === "30d" ? 148 : 237 };
  const userGitRank = { rank: scope === "myCollege" ? 1 : 3, score: gitTimeframe === "7d" ? 156 : gitTimeframe === "30d" ? 340 : 480 };
  const userStreakRank = { rank: scope === "myCollege" ? 2 : 8, current: 21, longest: 34 };

  const timeframeLabel = (tf) => (tf === "7d" ? "Past 7 Days" : tf === "30d" ? "Past 30 Days" : "All Time");

  return (
    <main className="profile-page min-h-screen px-5 py-10 md:py-14">
      <div className="mx-auto max-w-6xl">

        {/* --- Top Header Banner with Top 3 Podium --- */}
        <section className="surface overflow-hidden p-6 md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            {/* Title Block */}
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center border border-orange-200 bg-orange-50 text-2xl">🏆</div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-950 md:text-3xl">Leaderboard</h1>
                  <span className="border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-orange-700">Live Signal</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  See who's leading the way on Newbert today {scope === "myCollege" ? `at ${userCollege}` : "— every learner on the platform"}
                </p>
              </div>
            </div>

            {/* Top 3 Podium Visual */}
            <div className="flex items-end justify-center gap-3 pt-2 md:pt-0">
              <div className="flex flex-col items-center">
                <img src={filteredLeetcode[1]?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"} alt="Rank 2" className="h-9 w-9 rounded-full border-2 border-slate-300 object-cover" />
                <span className="mt-1 max-w-[65px] truncate text-[11px] font-bold text-slate-600">{filteredLeetcode[1]?.name || "—"}</span>
                <div className="mt-1 flex h-12 w-14 items-center justify-center border-t-2 border-slate-300 bg-slate-100 text-sm font-extrabold text-slate-600">2</div>
              </div>
              <div className="-mt-4 flex flex-col items-center">
                <span className="text-sm leading-none text-orange-500">👑</span>
                <img src={filteredLeetcode[0]?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} alt="Rank 1" className="h-11 w-11 rounded-full border-2 border-orange-500 object-cover" />
                <span className="mt-1 max-w-[75px] truncate text-[11px] font-extrabold text-orange-600">{filteredLeetcode[0]?.name || "—"}</span>
                <div className="mt-1 flex h-16 w-16 items-center justify-center border-t-2 border-orange-500 bg-orange-50 text-base font-extrabold text-orange-600">1</div>
              </div>
              <div className="flex flex-col items-center">
                <img src={filteredLeetcode[2]?.avatar || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100"} alt="Rank 3" className="h-9 w-9 rounded-full border-2 border-orange-300 object-cover" />
                <span className="mt-1 max-w-[65px] truncate text-[11px] font-bold text-orange-700">{filteredLeetcode[2]?.name || "—"}</span>
                <div className="mt-1 flex h-9 w-14 items-center justify-center border-t-2 border-orange-300 bg-orange-100 text-sm font-extrabold text-orange-700">3</div>
              </div>
            </div>
          </div>
        </section>

        {/* --- Upper Controls Bar: Scope, Platform View, College Filter, Search --- */}
        <section className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Toggle: Global vs My College */}
            <div className="flex border border-slate-300 bg-white p-1">
              <button
                onClick={() => setScope("global")}
                className={`px-4 py-2 text-xs font-extrabold transition-all ${scope === "global" ? "bg-orange-500 text-[#171918]" : "text-slate-600 hover:text-slate-900"}`}
              >
                🌐 Global
              </button>
              <button
                onClick={() => setScope("myCollege")}
                disabled={!hasRegisteredCollege}
                title={hasRegisteredCollege ? "" : "Add your college in your profile to unlock this"}
                className={`px-4 py-2 text-xs font-extrabold transition-all ${scope === "myCollege" ? "bg-orange-500 text-[#171918]" : "text-slate-600 hover:text-slate-900"} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                🏫 My College {hasRegisteredCollege ? `(${userCollege})` : ""}
              </button>
            </div>

            {/* View Toggle: Both vs LeetCode vs Git */}
            <div className="flex border border-slate-300 bg-white p-1">
              <button onClick={() => setPlatformView("both")} className={`px-3 py-1.5 text-xs font-bold transition-all ${platformView === "both" ? "border border-orange-300 bg-orange-50 text-orange-700" : "text-slate-600"}`}>📊 Both</button>
              <button onClick={() => setPlatformView("leetcode")} className={`px-3 py-1.5 text-xs font-bold transition-all ${platformView === "leetcode" ? "border border-orange-300 bg-orange-50 text-orange-700" : "text-slate-600"}`}>🧩 LeetCode</button>
              <button onClick={() => setPlatformView("git")} className={`px-3 py-1.5 text-xs font-bold transition-all ${platformView === "git" ? "border border-orange-300 bg-orange-50 text-orange-700" : "text-slate-600"}`}>🐙 Git</button>
            </div>
          </div>

         
        </section>

        {/* ================= STREAK LEADERBOARD ================= */}
        <section className="surface mt-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-950"><span>🔥</span> Streak Leaderboard</h2>
              <p className="mt-0.5 text-xs text-slate-600">Longest active daily-practice streaks across GitHub + LeetCode combined.</p>
            </div>
            <span className="border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-extrabold text-orange-700">Current Streak</span>
          </div>

          <div className="mt-5 flex items-center justify-between border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center border border-orange-300 bg-orange-100 text-lg">🔥</div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">Your Rank</p>
                <p className="text-xl font-extrabold text-orange-600">#{userStreakRank.rank} <span className="text-xs font-bold text-slate-500">{scope === "myCollege" ? `in ${userCollege}` : "out of all learners"}</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-extrabold text-slate-600">Current / Longest</p>
              <span className="mt-1 inline-flex items-center gap-1 border border-orange-300 bg-orange-100 px-3 py-1 text-xs font-extrabold text-orange-700">🔥 {userStreakRank.current} days / 🏅 {userStreakRank.longest} days</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {filteredStreaks.map((user) => <UserStreakCard key={user.name} user={user} />)}
          </div>
        </section>

        {/* --- Main Leaderboards Grid --- */}
        <div className={`mt-5 grid gap-5 ${platformView === "both" ? "lg:grid-cols-2" : "grid-cols-1"}`}>

          {/* ================= LEETCODE LEADERBOARD ================= */}
          {(platformView === "both" || platformView === "leetcode") && (
            <section className="surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-950"><span>👑</span> Top LeetCode Solvers</h2>
                  <p className="mt-0.5 text-xs text-slate-600">Users with most LeetCode solutions. <span className="cursor-pointer text-orange-600 underline">Connect LeetCode</span></p>
                </div>
                <select value={leetcodeTimeframe} onChange={(e) => setLeetcodeTimeframe(e.target.value)} className="control px-2.5 py-1.5 text-[11px] font-extrabold text-orange-700">
                  <option value="7d">Past 7 Days</option>
                  <option value="30d">Past 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div className="mt-5 flex items-center justify-between border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center border border-orange-300 bg-orange-100 text-lg">🏆</div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">Your Rank</p>
                    <p className="text-xl font-extrabold text-orange-600">#{userLeetcodeRank.rank} <span className="text-xs font-bold text-slate-500">{scope === "myCollege" ? `in ${userCollege}` : "out of all learners"}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-extrabold text-slate-600">Solved {timeframeLabel(leetcodeTimeframe)}</p>
                  <span className="mt-1 inline-flex items-center gap-1 border border-orange-300 bg-orange-100 px-3 py-1 text-xs font-extrabold text-orange-700">✓ {userLeetcodeRank.score} questions</span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {filteredLeetcode.map((user) => <UserRankCard key={user.name} user={user} metricLabel="solved" />)}
              </div>
            </section>
          )}

          {/* ================= GIT LEADERBOARD ================= */}
          {(platformView === "both" || platformView === "git") && (
            <section className="surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-950"><span>👑</span> Top Git Contributors</h2>
                  <p className="mt-0.5 text-xs text-slate-600">Users with most Git contributions. <span className="cursor-pointer text-orange-600 underline">Connect GitHub</span></p>
                </div>
                <select value={gitTimeframe} onChange={(e) => setGitTimeframe(e.target.value)} className="control px-2.5 py-1.5 text-[11px] font-extrabold text-orange-700">
                  <option value="7d">Past 7 Days</option>
                  <option value="30d">Past 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div className="mt-5 flex items-center justify-between border border-orange-200 bg-orange-600 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center border border-slate-300 bg-slate-100 text-lg">🐙</div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-900">Your Rank</p>
                    <p className="text-xl font-extrabold text-gray-900">#{userGitRank.rank} <span className="text-xs font-bold text-gray-900">{scope === "myCollege" ? `in ${userCollege}` : "out of all learners"}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-extrabold text-slate-600">Commits {timeframeLabel(gitTimeframe)}</p>
                  <span className="mt-1 inline-flex items-center gap-1 border border-orange-300 bg-orange-100 px-3 py-1 text-xs font-extrabold text-orange-700">⎇ {userGitRank.score} commits</span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {filteredGit.map((user) => <UserRankCard key={user.name} user={user} metricLabel="commits" />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

// --- Individual User Rank Card Component ---
function UserRankCard({ user, metricLabel }) {
  const isTop1 = user.dynamicRank === 1;
  const isTop2 = user.dynamicRank === 2;
  const isTop3 = user.dynamicRank === 3;

  const rankBadgeStyle = isTop1
    ? "bg-orange-500 text-[#171918] font-extrabold"
    : isTop2
    ? "bg-slate-400 text-slate-900 font-extrabold"
    : isTop3
    ? "bg-orange-300 text-orange-900 font-extrabold"
    : "bg-slate-100 text-slate-500 font-bold border border-slate-200";

  return (
    <div className={`group flex items-center justify-between border p-3 transition-all duration-200 ${isTop1 ? "border-orange-300 bg-orange-50" : "border-slate-200  hover:border-orange-300"}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${rankBadgeStyle}`}>{user.dynamicRank}</div>
        <img src={user.avatar} alt={user.name} className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover" />
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold text-slate-900 group-hover:text-orange-700">{user.name}</p>
          <span className="inline-block truncate text-[10px] font-semibold text-slate-500">{user.college}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-extrabold leading-tight text-orange-600">{user.score.toLocaleString()}</p>
        <p className="text-[10px] font-bold text-slate-500">{metricLabel}</p>
      </div>
    </div>
  );
}

// --- Individual User Streak Card Component ---
function UserStreakCard({ user }) {
  const isTop1 = user.dynamicRank === 1;
  const isTop2 = user.dynamicRank === 2;
  const isTop3 = user.dynamicRank === 3;

  const rankBadgeStyle = isTop1
    ? "bg-orange-500 text-[#171918] font-extrabold"
    : isTop2
    ? "bg-slate-300 text-slate-900 font-extrabold"
    : isTop3
    ? "bg-orange-300 text-orange-900 font-extrabold"
    : "bg-slate-100 text-slate-500 font-bold border border-slate-200";

  return (
    <div className={`group flex flex-col items-center gap-1.5 border p-3 text-center transition-all duration-200 ${isTop1 ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white hover:border-orange-300"}`}>
      <div className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${rankBadgeStyle}`}>{user.dynamicRank}</div>
      <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full border border-slate-200 object-cover" />
      <p className="w-full truncate text-xs font-extrabold text-slate-900 group-hover:text-orange-700">{user.name}</p>
      <span className="w-full truncate text-[10px] font-semibold text-slate-500">{user.college}</span>
      <p className="mt-0.5 text-base font-extrabold leading-none text-orange-600">🔥 {user.currentStreak}</p>
      <p className="text-[10px] font-bold text-slate-500">best {user.longestStreak}d</p>
    </div>
  );
}