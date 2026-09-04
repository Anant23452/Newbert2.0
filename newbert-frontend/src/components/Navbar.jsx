import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import useAuth from "../hook/useAuth";

const links = [
  { to: "/alumni-wall", label: "Alumni" },
  { to: "/roadmap", label: "My Plan" },
  { to: "/jobs", label: "Jobs" },
  { to: "/resume-ai", label: "Resume AI" },
  { to: "/courses", label: "Courses" },
  { to: "/notes", label: "Notes" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/mentorship", label: "Mentorship" },
];

export default function Navbar({ theme, onThemeToggle, onSignIn }) {
  const [open, setOpen] = useState(false);
  const { profile, user, loading } = useAuth();
  const identity = profile || user;
  const navigate = useNavigate();

  return (
    <header className="site-nav sticky top-0 z-50 border-b border-slate-800/80 bg-[#0b1322]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Newbert home">
          <span className="h-8 w-8 place-items-center rounded-md overflow-hidden">
            <img
              className="h-full w-full object-cover"
              src="https://i.pinimg.com/1200x/41/4a/3c/414a3c7f720792044aad320292d6ccd5.jpg"
              alt="Newbert Logo"
            />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">Newbert</span>
        </Link>

        {/* Desktop Direct Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Primary navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-2 py-1 text-xs xl:px-2.5 xl:py-1.5 xl:text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "border-b-2 border-orange-400 bg-white/[0.06] font-bold text-orange-400 shadow-sm"
                    : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right Section: Theme Toggle, Profile/Avatar, Admin Links, Build My Plan */}
        <div className="flex items-center gap-2.5 xl:gap-3 shrink-0">
          <button
            onClick={onThemeToggle}
            className="theme-toggle"
            aria-label={`Switch to ${theme === "day" ? "night" : "day"} theme`}
            title={`Switch to ${theme === "day" ? "night" : "day"} theme`}
          >
            <span aria-hidden="true" className="theme-toggle-icon">
              {theme === "day" ? "Moon" : "Sun"}
            </span>
            <span className="hidden sm:inline">{theme === "day" ? "Night" : "Day"}</span>
          </button>

          {identity ? (
            <button
              onClick={() => navigate(profile?.onboardingCompleted ? "/profile" : "/complete-profile")}
              className="grid h-8 w-8 xl:h-9 xl:w-9 place-items-center overflow-hidden rounded-full border border-orange-400/40 bg-orange-400/10 text-xs font-extrabold text-orange-200 transition hover:border-orange-400"
              aria-label="Open my profile"
            >
              {identity.avatar ? (
                <img src={identity.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                identity.name?.slice(0, 1).toUpperCase()
              )}
            </button>
          ) : (
            <button
              disabled={loading}
              onClick={onSignIn}
              className="text-xs xl:text-sm font-semibold text-slate-300 transition hover:text-white disabled:opacity-50"
            >
              {loading ? "Loading…" : "Sign in"}
            </button>
          )}

          {user?.isAdmin && (
            <div className="hidden 2xl:flex items-center gap-2">
              <button
                onClick={() => navigate("/admin/jobs")}
                className="text-xs font-bold text-orange-400 hover:text-orange-300"
              >
                Admin Jobs
              </button>
              <button
                onClick={() => navigate("/admin/courses")}
                className="text-xs font-bold text-orange-400 hover:text-orange-300"
              >
                Admin Courses
              </button>
            </div>
          )}

          {/* Desktop single top-right orange CTA */}
          <button
            onClick={() => navigate("/roadmap")}
            className="hidden lg:inline-flex items-center justify-center rounded-md bg-orange-500 px-3 py-1.5 text-xs xl:px-4 xl:py-2 xl:text-sm font-bold text-[#0b1322] shadow-sm transition hover:bg-orange-400"
          >
            Build my plan
          </button>

          {/* Mobile / Tablet Hamburger Toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-700 bg-white/5 text-slate-300 hover:border-slate-500 hover:text-white lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="primary-navigation"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Drawer Menu */}
      {open && (
        <nav
          id="primary-navigation"
          className="site-nav-menu border-t border-slate-800 bg-[#0e1828] px-5 py-4 lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1.5">
            {links.map((link) => (
              <NavLink
                key={link.to}
                onClick={() => setOpen(false)}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-l-2 border-orange-400 bg-orange-400/10 font-bold text-orange-400"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            {identity ? (
              <button
                onClick={() => {
                  setOpen(false);
                  navigate(profile?.onboardingCompleted ? "/profile" : "/complete-profile");
                }}
                className="mt-2 rounded-md border border-orange-400/30 bg-orange-400/10 px-3 py-2 text-left text-sm font-bold text-orange-300"
              >
                My profile ({identity.name || "User"})
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={() => {
                  setOpen(false);
                  onSignIn();
                }}
                className="mt-2 rounded-md border border-orange-400/30 bg-orange-400/10 px-3 py-2 text-left text-sm font-bold text-orange-300"
              >
                {loading ? "Loading…" : "Sign in"}
              </button>
            )}

            {user?.isAdmin && (
              <div className="flex flex-col gap-1 pt-1">
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/admin/jobs");
                  }}
                  className="rounded-md border border-slate-700 px-3 py-2 text-left text-xs font-bold text-orange-400 hover:bg-white/5"
                >
                  Admin Jobs
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/admin/courses");
                  }}
                  className="rounded-md border border-slate-700 px-3 py-2 text-left text-xs font-bold text-orange-400 hover:bg-white/5"
                >
                  Admin Courses
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setOpen(false);
                navigate("/roadmap");
              }}
              className="mt-2 rounded-md bg-orange-500 px-3 py-2 text-center text-sm font-bold text-[#0b1322] hover:bg-orange-400"
            >
              Build my plan
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
