import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import useAuth from "../hook/useAuth";

const links = [
  { to: "/alumni-wall", label: "Alumni outcomes" },
  { to: "/roadmap", label: "My plan" },
  { to: "/jobs", label: "Jobs" },
  { to: "/resume-ai", label: "Resume AI" },
  { to: "/courses", label: "Courses" },
  { to: "/notes", label: "Study notes" },
  { to: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar({ theme, onThemeToggle, onSignIn }) {
  const [open, setOpen] = useState(false);
  const { profile, user, loading } = useAuth();
  const identity = profile || user;
  const navigate = useNavigate();

  return (
    <header className="site-nav sticky top-0 z-50 border-b border-slate-200 bg-[#f7f8fa]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Newbert home">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-teal-700 font-bold text-white">N</span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">Newbert</span>
        </Link>

        <nav className="hidden items-center gap-3 xl:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `text-sm font-semibold transition ${isActive ? "text-teal-700" : "text-slate-600 hover:text-slate-950"}`}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button onClick={() => setOpen(!open)} className="hidden h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-extrabold text-slate-700 hover:border-teal-700 hover:text-teal-700 md:inline-flex xl:hidden" aria-expanded={open} aria-controls="primary-navigation">
            Explore <span aria-hidden="true">+</span>
          </button>
          <button onClick={onThemeToggle} className="theme-toggle" aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} theme`} title={`Switch to ${theme === 'day' ? 'night' : 'day'} theme`}>
            <span aria-hidden="true" className="theme-toggle-icon">{theme === 'day' ? 'Moon' : 'Sun'}</span>
            <span>{theme === 'day' ? 'Night' : 'Day'}</span>
          </button>
          {identity ? <button onClick={() => navigate(profile?.onboardingCompleted ? "/profile" : "/complete-profile")} className="grid h-9 w-9 overflow-hidden rounded-full border-2 border-teal-700 bg-teal-50 text-xs font-extrabold text-teal-800" aria-label="Open my profile">{identity.avatar ? <img src={identity.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : identity.name?.slice(0, 1).toUpperCase()}</button> : <button disabled={loading} onClick={onSignIn} className="text-sm font-semibold text-slate-700 hover:text-slate-950 disabled:opacity-50">{loading ? "Loading…" : "Sign in"}</button>}
          <button onClick={() => navigate("/roadmap")} className="hidden rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800 lg:inline-flex">Build my plan</button>
        </div>

        <button onClick={() => setOpen(!open)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 text-slate-700 md:hidden" aria-label="Toggle navigation">
          <span className="text-lg leading-none">{open ? "x" : "="}</span>
        </button>
      </div>
      {open && <nav id="primary-navigation" className="site-nav-menu border-t border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-6xl flex-col gap-1">
          {links.map((link) => <NavLink key={link.to} onClick={() => setOpen(false)} to={link.to} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{link.label}</NavLink>)}
          {identity ? <button onClick={() => { setOpen(false); navigate(profile?.onboardingCompleted ? "/profile" : "/complete-profile"); }} className="mt-2 rounded-md border border-teal-700 px-3 py-2 text-left text-sm font-bold text-teal-700 md:hidden">My profile</button> : <button disabled={loading} onClick={() => { setOpen(false); onSignIn(); }} className="mt-2 rounded-md border border-orange-400 px-3 py-2 text-left text-sm font-bold text-orange-700 md:hidden">{loading ? "Loading…" : "Sign in"}</button>}
          <button onClick={onThemeToggle} className="theme-toggle mt-2 justify-center md:hidden" aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} theme`}><span aria-hidden="true" className="theme-toggle-icon">{theme === 'day' ? 'Moon' : 'Sun'}</span><span>{theme === 'day' ? 'Night mode' : 'Day mode'}</span></button>
          <button onClick={() => { setOpen(false); navigate("/roadmap"); }} className="mt-2 rounded-md bg-teal-700 px-3 py-2 text-left text-sm font-bold text-white">Build my plan</button>
        </div>
      </nav>}
    </header>
  );
}
