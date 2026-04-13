import React from "react";
import { useState } from "react";
import studentImg from "../assets/Tips_mudah_menghadapi_bosan_saat_sedang_belajar___Refrez-removebg-preview.png";
import banner from "../assets/namaste-react-banner-hd.webp";
import laptopimg from "../assets/pngtree-laptop-isolated-on-white-business-macbook-computer-png-image_13466023.png";


function Home() {
  const [activeSide, setActiveSide] = useState(null); // controls hover state
  const [active, setActive] = useState("right");

  return (
    <>
      {/* // First page */}
      <div className="first-page h-screen  py-20 bg-[#1A1A2E] font-[Orbitron]  ">
        <div className="head-1   ">
          <h1 className="text-4xl font-bold text-white text-center">
            Stop guessing. <br />
            See exactly what got <br />
            <span className="text-orange-500">your seniors placed.</span>
          </h1>
        </div>

        <div className="head-2  mt-2 ">
          <h1 className="text-center text-oklch(86.9% 0.022 252.894) ">
            Real placement journeys from students at YOUR college. <br />
            Not generic advice. Not IIT stories. <br /> YOUR college. YOUR
            truth.
          </h1>
        </div>

        <div className="hero-btn flex justify-center gap-3 p-2 flex-col sm:flex-row items-center  font-bold mt-5 ">
          <button className="bg-orange-500 text-white px-6 py-2  rounded-2xl">
            See Alumni from Your College
          </button>

          <button className="bg-white text-orange-500 px-6 py-2 rounded-2xl border border-orange-500">
            Check your current gap
          </button>
        </div>

        <div className="w-full bg-[#1A1A2E] py-10 mt-10">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {/* Stat 1 */}
            <div>
              <h2 className="text-orange-400 text-3xl font-bold">1+</h2>
              <p className="text-gray-400 text-sm mt-1">AKTU colleges</p>
            </div>

            {/* Stat 2 */}
            <div>
              <h2 className="text-orange-400 text-3xl font-bold">50+</h2>
              <p className="text-gray-400 text-sm mt-1">Alumni stories</p>
            </div>

            {/* Stat 3 */}
            <div>
              <h2 className="text-orange-400 text-3xl font-bold">20+</h2>
              <p className="text-gray-400 text-sm mt-1">Students guided</p>
            </div>

            {/* Stat 4 */}
            <div>
              <h2 className="text-orange-400 text-3xl font-bold">6LPA</h2>
              <p className="text-gray-400 text-sm mt-1">Avg package</p>
            </div>
          </div>
        </div>
      </div>

      {/* // Second page */}
      <div className="second-page h-screen flex items-center justify-center  bg-[#1A1A2E]">
        <div
          className="relative min-h-screen w-full overflow-hidden text-white font-['Plus_Jakarta_Sans']
  "
        >
          {/* 🔥 Background Glow */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px]" />

          {/* 🧠 HEADLINE */}
          <div className="text-center mb-16 z-10 px-4 font-[Orbitron] ">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
              {" "}
              Two Paths.<span className=" text-orange-500">One Truth.</span>
            </h1>
          </div>

          {/* 🧩 MAIN GRID */}
          <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-3 gap-10 items-center relative z-10">
            {/* ❌ LEFT: CHAOS */}
            <div
              onMouseEnter={() => setActiveSide("generic")}
              onMouseLeave={() => setActiveSide(null)}
              className={`transition-all duration-500 ${
                activeSide === "newbert" ? "opacity-50 grayscale" : ""
              } bg-yellow-100/10 p-6 rounded-xl shadow-lg`}
            >
              <h2 className="text-2xl text-center font-bold text-slate-400 mb-6 font-[Orbitron]">
                Generic Advice
              </h2>

              <div className="space-y-4 relative">
                <div className="bg-[#1a1c22] border border-red-900/30 p-4 rounded-xl rotate-[-2deg] shadow-xl">
                  <p className="text-[10px] text-red-400 font-mono">
                    ERROR: No Placement Clarity
                  </p>
                </div>

                <div className="bg-[#1a1c22] border border-slate-800 p-4 rounded-xl rotate-[3deg] shadow-xl">
                  <p className="text-[11px] text-slate-500 italic">
                    "Do 1000 DSA questions bro..."
                  </p>
                </div>

                <div className="bg-[#1a1c22] border border-slate-800 p-4 rounded-xl rotate-[-4deg] shadow-xl">
                  <p className="text-[11px] text-slate-500 italic">
                    "Buy this random course..."
                  </p>
                </div>
              </div>
            </div>

            {/* 🎯 CENTER: STUDENT */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-50 h-50 flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-105">
                  <span className="text-4xl">
                    <img
                      className="w-full h-full object-cover"
                      src={studentImg}
                      alt=""
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* ✅ RIGHT: NEWBERT */}
            <div
              onMouseEnter={() => setActiveSide("newbert")}
              onMouseLeave={() => setActiveSide(null)}
              className={`transition-all duration-500 ${
                activeSide === "generic" ? "opacity-30 grayscale" : ""
              }`}
            >
              <h2 className="text-2xl font-bold text-orange-500 mb-6 text-center font-[Orbitron]">
                Newbert: The Truth
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {/* gap analysis card */}
                <div
                  className="bg-[#1a1c22] border border-orange-500/20 p-5 rounded-xl 
hover:border-orange-500 transition rotate-[-4deg] shadow-xl w-full max-w-md"
                >
                  {/* Title */}
                  <div className="mb-4">
                    <p className="text-orange-500 text-lg"></p>
                    <p className="text-xs text-slate-400">Gap Analysis</p>
                  </div>

                  {/* Progress Items */}
                  <div className="space-y-4">
                    {/* DSA */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">DSA questions</span>
                        <span className="text-orange-500">140 / 300</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full">
                        <div className="h-2 bg-orange-500 rounded-full w-[45%]"></div>
                      </div>
                    </div>

                    {/* Frontend */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Frontend</span>
                        <span className="text-green-500">70% ✓</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full">
                        <div className="h-2 bg-green-500 rounded-full w-[70%]"></div>
                      </div>
                    </div>

                    {/* Backend */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Backend</span>
                        <span className="text-orange-500">25%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full">
                        <div className="h-2 bg-orange-500 rounded-full w-[25%]"></div>
                      </div>
                    </div>

                    {/* Full Stack */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">
                          Full stack project
                        </span>
                        <span className="text-red-500">Missing</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full">
                        <div className="h-2 bg-red-500 rounded-full w-[10%]"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* company match card */}

                <div
                  className="bg-[#1a1c22] border border-orange-500/20 p-5 rounded-xl 
hover:border-orange-500 transition rotate-[3deg] shadow-xl w-full max-w-md"
                >
                  {/* Title */}
                  <div className="mb-4">
                    <p className="text-orange-500 text-lg">🧠</p>
                    <p className="text-xs text-slate-400">
                      AI Company Prediction
                    </p>
                  </div>

                  {/* Company List */}
                  <div className="space-y-4">
                    {/* Company 1 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          TCS Digital
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Based on AKTU seniors
                        </p>
                      </div>
                      <span className="text-green-500 text-sm font-bold">
                        82%
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="w-full h-2 bg-slate-700 rounded-full">
                      <div className="h-2 bg-green-500 rounded-full w-[82%]"></div>
                    </div>

                    {/* Company 2 */}
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Infosys
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Similar skill match
                        </p>
                      </div>
                      <span className="text-orange-500 text-sm font-bold">
                        65%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-700 rounded-full">
                      <div className="h-2 bg-orange-500 rounded-full w-[65%]"></div>
                    </div>

                    {/* Company 3 */}
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Startups (5–10 LPA)
                        </p>
                        <p className="text-[10px] text-slate-400">
                          High growth potential
                        </p>
                      </div>
                      <span className="text-yellow-500 text-sm font-bold">
                        50%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-700 rounded-full">
                      <div className="h-2 bg-yellow-500 rounded-full w-[50%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 🚀 CTA */}
          <div className="flex justify-center pt-10">
            <button
              className="bg-orange-600 hover:bg-orange-500 
  px-8 py-3 rounded-full font-bold text-white
  shadow-lg shadow-orange-500/30 
  transition transform hover:scale-105"
            >
              🚀 Start Your Journey — Free
            </button>
          </div>
        </div>
      </div>

      {/* third page  */}
      <div className="third-page h-screen flex flex-col bg-[#1A1A2E] pt-10 border-t border-orange-500/20 ">
        <div className="textarea  flex justify-center flex-col">
          <h1 className="text-4xl font-bold text-center mb-4 font-[Orbitron]">
            Know Your Job Before{" "}
            <span className="text-orange-500">You Apply.</span>
          </h1>
          <h5 className="text-center leading-tight  text-gray-400 max-w-2xl mx-auto">
            Newbert analyzes your skills, compares them with real placed
            students, <br /> and shows jobs you actually have a chance of
            getting — along <br /> with what you're missing to reach 100%.
          </h5>
          <button
            className="text-center bg-orange-600 hover:bg-orange-500 
   rounded-full font-bold text-white
  shadow-lg shadow-orange-500/30 
  transition transform hover:scale-105 m-auto mt-10 px-8 py-3"
          >
            <p>Check your job matches</p>
          </button>
        </div>

        <div className="relative w-full flex flex-col items-center  justify-center ">
          {/* 🔥 SVG CONNECTION */}

          {/* 🧠 GRID */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5 
      bg-[#1a1c22]  p-6 rounded-xl shadow-xl 
      w-full max-w-6xl mx-auto min-h-[350px]"
          >
            {/* 👨‍💻 PROFILE (CENTER) */}
            <div className="bg-[#0f1115] rounded-xl p-5 flex flex-col items-center justify-center hover:scale-105 transition">
              <div className="text-4xl mb-2">🤖</div>
              <h3 className="text-white font-bold">
                Newb <span className="text-orange-500">AI</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 text-center">
                Analyzing your profile...
              </p>

              {/* Floating skills */}
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {["DSA", "React", "Node"].map((skill, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full animate-pulse"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* 💼 JOB MATCHES */}
            <div
              onMouseEnter={() => setActive("right")}
              className="bg-[#0f1115] rounded-xl p-5 space-y-4 hover:scale-105 transition"
            >
              <h3 className="text-white font-bold mb-2">AI Job Matches</h3>

              {[
                { name: "TCS Digital", match: 82 },
                { name: "Infosys", match: 65 },
                { name: "Wipro Elite", match: 58 },
                { name: "Startup (React Dev)", match: 50 },
              ].map((job, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{job.name}</span>
                    <span className="text-orange-500 font-bold">
                      {job.match}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-700 rounded-full mt-1">
                    <div
                      className="h-2 bg-orange-500 rounded-full transition-all duration-700"
                      style={{ width: `${job.match}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* ⚠️ WEAKNESS PANEL */}
            <div
              onMouseEnter={() => setActive("left")}
              className="bg-[#0f1115] rounded-xl p-5 
  hover:scale-[1.03] hover:border-red-500/40 
  border border-transparent transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-red-400 font-semibold text-sm">
                  ⚠ Skill Gaps
                </h3>
                <span className="text-[10px] text-slate-500">
                  Improve to grow
                </span>
              </div>

              {/* Skills */}
              <div className="space-y-3 text-xs">
                {/* Backend */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Backend</span>
                    <span className="text-red-400">25%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full mt-1">
                    <div className="h-1.5 bg-red-500 w-[25%] rounded-full transition-all"></div>
                  </div>
                </div>

                {/* System Design */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">System Design</span>
                    <span className="text-red-400">0%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full mt-1">
                    <div className="h-1.5 bg-red-500 w-[5%] rounded-full"></div>
                  </div>
                </div>

                {/* DSA */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">DSA</span>
                    <span className="text-orange-400">140 / 300</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full mt-1">
                    <div className="h-1.5 bg-orange-500 w-[45%] rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-800 my-4"></div>

              {/* Action Section */}
              <div className="text-[11px] text-slate-400">
                <p className="text-orange-400 font-medium mb-1">
                  🚀 Path to 100%
                </p>
                <ul className="space-y-1">
                  <li>• +160 DSA problems</li>
                  <li>• Build 2 backend APIs</li>
                  <li>• Learn system design basics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* fourth page  */}
   <div className="forth-page h-screen flex md:flex-row items-center justify-center bg-[#1A1A2E] relative overflow-hidden ">

  {/* LEFT GRADIENT */}
 <div className="absolute top-0 left-0 w-[40%] h-full bg-[#1A1A2E]pointer-events-none flex items-center pl-10">
  
  <div className="ml-10 max-w-sm flex flex-col gap-4 pointer-events-auto">
    
    <h1 className="text-6xl font-bold text-white leading-snug font-[Orbitron]">
      “Stuck choosing <span className="text-orange-500">from</span> millions of courses?”
    </h1>

    <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-full transition w-fit">
      Get the best course for you
    </button>

  </div>

</div>

  {/* RIGHT GRADIENT */}
  <div className="w-[60%]"  ></div>
  

  {/* MAIN CONTENT */}
  <div className="  relative w-full max-w-4xl h-full flex items-center justify-center ">

    {/* 💻 LAPTOP CENTER */}
    <div className="relative w-50 h-60 rotate-[10deg] z-10 ">
      <img
        src={laptopimg}
        className="w-full h-full object-contain drop-shadow-xl"
        alt="laptop"
      />
    </div>

    {/* 📦 COURSE BOX 1 */}
    <div className="absolute top-10 left-20 bg-[#1a1c22] border border-orange-500/20 p-4 rounded-xl shadow-lg hover:scale-105 transition w-44 rotate-[-8deg]">
      <h3 className="text-sm font-semibold text-white">React</h3>
      <div className="w-full h-20 mt-2 overflow-hidden rounded-md">
        <img src={banner} className="w-full h-full object-cover" alt="" />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">
        Frontend Focus
      </p>
      <div className="mt-2 text-yellow-400 text-xs">
        ⭐ 4.6
      </div>
    </div>

    {/* 📦 COURSE BOX 2 */}
    <div className="absolute top-16 right-20 bg-[#1a1c22] border border-orange-500/20 p-4 rounded-xl shadow-lg hover:scale-105 transition w-44 rotate-[6deg]">
      <h3 className="text-sm font-semibold text-white">Node.js</h3>
      <div className="w-full h-20 mt-2 overflow-hidden rounded-md">
        <img src="https://assets.telegraphindia.com/telegraph/2022/Jan/1643172156_resized-02.jpg" className="w-full h-full object-cover" alt="" />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">Backend Basics</p>
      <div className="mt-2 text-yellow-400 text-xs">⭐ 4.5</div>
    </div>

    {/* 📦 COURSE BOX 3 */}
    <div className="absolute bottom-16 left-24 bg-[#1a1c22] border border-orange-500/20 p-4 rounded-xl shadow-lg hover:scale-105 transition w-44 rotate-[4deg]">
      <h3 className="text-sm font-semibold text-white">DSA Mastery</h3>
      <div className="w-full h-20 mt-2 overflow-hidden rounded-md">
        <img src="https://shashankskills.academy/upload/courses/coding/coding_advanced1.webp" className="w-full h-full object-cover" alt="" />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">Placement Ready</p>
      <div className="mt-2 text-yellow-400 text-xs">⭐ 4.8</div>
    </div>

    {/* 📦 COURSE BOX 4 */}
    <div className="absolute bottom-10 right-24 bg-[#1a1c22] border border-orange-500/20 p-4 rounded-xl shadow-lg hover:scale-105 transition w-44 rotate-[-6deg]">
      <h3 className="text-sm font-semibold text-white">System Design</h3>
      <div className="w-full h-20 mt-2 overflow-hidden rounded-md">
        <img src="https://prod.superblogcdn.com/site_cuid_clvc4016q001j13bhaleswmt1/images/06a8ba02-2ea4-46e7-9f30-a649ccb3db45-1723111047597-compressed.jpeg" className="w-full h-full object-cover" alt="" />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">Advanced Prep</p>
      <div className="mt-2 text-yellow-400 text-xs">⭐ 4.3</div>
    </div>

  </div>
</div>

      {/* fifth pae  */}
    <div className="fifth-page h-screen flex items-center px-5 bg-[#1A1A2E]">

  <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-10">
    
    {/* LEFT SIDE — TEXT */}
    <div className="max-w-xl">
      <div className="text-orange-500 text-xs font-bold tracking-widest bg-[#1A1A2E] uppercase mb-2">
        Every morning
      </div>

      <h2 className="text-4xl font-extrabold text-gray-200 mb-3">
        Arjun opens Newbert first thing.<br />
        <span className="text-orange-500">
          Rank #14. Rank #13 is just 26 points ahead.
        </span>
      </h2>

      <p className="text-gray-400 mb-8 max-w-md leading-relaxed">
        He opens LeetCode that evening. Nobody told him to. The gap told him.
        That's the psychology of Newbert's college-wise leaderboard.
      </p>
    </div>

    {/* RIGHT SIDE — CARD */}
    <div className="bg-[#1a1a2e] rounded-3xl p-5 max-w-sm w-full">
      
      {/* Time filter */}
      <div className="flex gap-2 mb-3">
        {["Today", "This week", "Month", "All time"].map((t, i) => (
          <button
            key={t}
            className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
              i === 1
                ? "bg-orange-500 text-white"
                : "bg-[#2a2a4a] text-gray-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Scope filter */}
      <div className="flex gap-2 mb-5">
        {["My college", "All AKTU", "All India"].map((s, i) => (
          <button
            key={s}
            className={`text-xs px-3 py-1 rounded-full font-semibold ${
              i === 0
                ? "bg-orange-500 text-white"
                : "text-gray-500 bg-[#2a2a4a]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 mb-5">
        {[
          { i: "PS", n: "Priya S.", p: "1,890 pts", pos: 2, h: "h-14", bg: "bg-gray-700" },
          { i: "VK", n: "Vikram K.", p: "2,140 pts", pos: 1, h: "h-20", bg: "bg-orange-500", crown: true },
          { i: "AM", n: "Amit M.", p: "1,654 pts", pos: 3, h: "h-10", bg: "bg-gray-800" },
        ].map(p => (
          <div key={p.pos} className="flex flex-col items-center gap-1">
            {p.crown && <span className="text-xl">👑</span>}
            <div className={`w-9 h-9 rounded-full ${p.bg} flex items-center justify-center text-white text-xs font-bold`}>
              {p.i}
            </div>
            <div className="text-white text-xs font-bold">{p.n}</div>
            <div className="text-gray-400 text-xs">{p.p}</div>
            <div className={`w-14 ${p.h} ${p.bg} rounded-t-lg flex items-start justify-center pt-2`}>
              <span className="text-white font-bold text-sm">{p.pos}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-gray-600 text-xs mb-3">· · · · ·</div>

      {/* You */}
      <div className="bg-orange-500/20 border border-orange-500 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-2">
        <span className="text-orange-400 font-bold text-sm w-7">#14</span>
        <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
          AK
        </div>
        <div className="flex-1">
          <div className="text-orange-400 font-bold text-xs">You — Arjun</div>
          <div className="text-gray-500 text-xs">140 DSA · 12 day streak</div>
        </div>
        <div className="text-right">
          <div className="text-orange-400 font-bold">892</div>
          <div className="text-green-400 text-xs">↑ 3 places</div>
        </div>
      </div>

      <div className="text-center text-gray-500 text-xs">
        Rank #13 — only <span className="text-orange-400 font-bold">26 points</span> ahead 👀
      </div>

    </div>

  </div>
</div>



              {/* footer */}
      <div className="footer-page h-full flex flex-col bg-[#1A1A2E] pt-10 border-t border-orange-500/20 ">
   
        <div className="bg-[#1a1a2e] py-0 px-5 text-center">
          <div className="max-w-xl mx-auto ">
            <div className="text-5xl mb-6">🎓</div>
            <h2 className="text-white font-extrabold text-5xl mb-3 leading-tight">
              Arjun got placed.<br />
              <span className="text-orange-400">Your story starts here.</span>
            </h2>
            <p className="text-gray-400 mb-2 leading-relaxed">India has 40 million college students.</p>
            <p className="text-gray-400 mb-8 leading-relaxed">Most of them are flying blind. <span className="text-orange-400 font-bold">Newbert fixes that.</span></p>

           
            <p className="text-gray-600 text-xs">No credit card · No spam · Just your placement truth</p>
          </div>
        </div>
     
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="text-white font-extrabold text-xl mb-3">
                New<span className="text-orange-400">Bert</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed mb-4">
                AI-powered placement intelligence for Tier-2 & Tier-3 India.
                Built by AKTU students, for AKTU students.
              </p>
              <div className="flex gap-2">
                {["in", "ig", "tw"].map((s) => (
                  <button
                    key={s}
                    className="w-8 h-8 bg-gray-800 hover:bg-orange-500 rounded-full text-gray-400 hover:text-white text-xs transition-all font-bold"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <div className="text-white text-xs font-bold uppercase tracking-widest mb-3">
                Product
              </div>
              {[
                "Alumni wall",
                "Job matching",
                "Resume AI",
                "Leaderboard",
                "Mentors",
                "Courses",
                "GATE section",
              ].map((l) => (
                <div
                  key={l}
                  className="text-gray-500 hover:text-orange-400 text-xs mb-2 cursor-pointer transition-colors"
                >
                  {l}
                </div>
              ))}
            </div>

            {/* Students */}
            <div>
              <div className="text-white text-xs font-bold uppercase tracking-widest mb-3">
                For students
              </div>
              {[
                "Gap analysis",
                "My roadmap",
                "My profile",
                "DSA tracker",
                "Submit story",
                "Book mentor",
              ].map((l) => (
                <div
                  key={l}
                  className="text-gray-500 hover:text-orange-400 text-xs mb-2 cursor-pointer transition-colors"
                >
                  {l}
                </div>
              ))}
            </div>

            {/* Company */}
            <div>
              <div className="text-white text-xs font-bold uppercase tracking-widest mb-3">
                Company
              </div>
              {[
                "About us",
                "Team",
                "Blog",
                "Privacy policy",
                "Terms",
                "Contact",
              ].map((l) => (
                <div
                  key={l}
                  className="text-gray-500 hover:text-orange-400 text-xs mb-2 cursor-pointer transition-colors"
                >
                  {l}
                </div>
              ))}
              <div className="mt-4 bg-gray-800 rounded-xl p-3">
                <div className="text-gray-400 text-xs">newbert.in</div>
                <div className="text-gray-600 text-xs mt-0.5">
                  hello@newbert.in
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-900 rounded-2xl p-4 mb-8">
            {[
              ["500+", "Alumni stories"],
              ["40+", "AKTU colleges"],
              ["2,000+", "Students guided"],
              ["₹0", "Fake listings"],
            ].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-orange-400 font-bold text-lg">{v}</div>
                <div className="text-gray-500 text-xs">{l}</div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-gray-600 text-xs">
              © 2026 NewBert · Built with ❤️ in AKTU · Made by Tier-3 students,
              for Tier-3 students
            </div>
            <div className="text-orange-400 font-bold text-sm italic text-center">
              "Not IIT stories. YOUR college. YOUR truth."
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;
