import React, { useState } from "react";
import AuthModel from "./AuthModel";
import { useNavigate, Link } from "react-router-dom";
import {useEffect} from "react";

function Navbar() {
  useEffect(() => {
  const token = localStorage.getItem("token");

  if (token) {
    // fake user restore (later from backend)
    setUser({ name: "Anant" });
  }
}, []);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  const handleLogin = (userData) => {
    setUser(userData);
    setShowAuth(false);
  };

  return (
    <>
      <nav className="flex justify-between items-center px-6 py-3 bg-[#0f1226] text-white">

        {/* 🔹 LOGO */}
        <h1 className="text-xl font-bold select-none">
          New<span className="text-orange-500">Bert</span>
        </h1>

        {/* 🔹 NAV LINKS */}
        <div className="flex gap-6 text-gray-300 text-sm">
          <Link to="/">Home</Link>
          <Link to="/alumni-wall">Alumni wall</Link>
          <Link to="/jobs">Jobs</Link>
          <Link to="/resume-ai">Resume AI</Link>
          <Link to="/courses">Courses</Link>
          <Link to="/roadmap">My roadmap</Link>
          <Link to="/leaderboard">Leaderboard</Link>
        </div>

        {/* 🔹 RIGHT SIDE */}
        <div className="flex items-center gap-3">

          {user ? (
            <>
              {/* 🔥 STREAK */}
              <div className="flex items-center gap-2 bg-[#1a1f3a] px-3 py-1 rounded-xl">
                <span className="text-orange-500">🔥</span>
                <span className="text-sm">
                  <span className="text-orange-400 font-bold">12</span>
                  <span className="text-gray-400 text-xs ml-1">streak</span>
                </span>
              </div>

              {/* 🔔 */}
              <div className="bg-[#1a1f3a] p-2 rounded-lg cursor-pointer">
                🔔
              </div>

              {/* 🌙 */}
              <div className="bg-[#1a1f3a] p-2 rounded-lg cursor-pointer">
                🌙
              </div>

              {/* 👤 PROFILE */}
              <div
                onClick={() => navigate("/profile")}
                className="w-9 h-9 flex items-center justify-center bg-orange-500 rounded-full font-bold cursor-pointer"
              >
                {user?.name?.[0] || "U"}
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="bg-white text-black px-4 py-1 rounded-lg"
            >
              Login
            </button>
          )}
        </div>
      </nav>

      <AuthModel
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onLoginSuccess={handleLogin}
      />
    </>
  );
}

export default Navbar;