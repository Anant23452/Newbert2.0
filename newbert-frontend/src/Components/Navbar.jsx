import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

const links = [
  { to: "/alumni-wall", label: "Alumni outcomes" },
  { to: "/roadmap", label: "My plan" },
  { to: "/jobs", label: "Jobs" },
  { to: "/resume-ai", label: "Resume AI" },
  { to: "/courses", label: "Courses" },
  { to: "/notes", label: "Study notes" },
  { to: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar({ theme, onThemeToggle }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="site-nav sticky top-0 z-50 border-b border-slate-200 bg-[#f7f8fa]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Newbert home">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-teal-700 font-bold text-white">N</span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">Newbert</span>
        </Link>

        <nav className="hidden items-center gap-4 lg:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `text-sm font-semibold transition ${isActive ? "text-teal-700" : "text-slate-600 hover:text-slate-950"}`}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button onClick={onThemeToggle} className="theme-toggle" aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} theme`} title={`Switch to ${theme === 'day' ? 'night' : 'day'} theme`}>
            <span aria-hidden="true" className="theme-toggle-icon">{theme === 'day' ? 'Moon' : 'Sun'}</span>
            <span>{theme === 'day' ? 'Night' : 'Day'}</span>
          </button>
          <button onClick={() => navigate("/profile")} className="text-sm font-semibold text-slate-700 hover:text-slate-950">Sign in</button>
          <button onClick={() => navigate("/roadmap")} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800">Build my plan</button>
        </div>

        <button onClick={() => setOpen(!open)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 text-slate-700 md:hidden" aria-label="Toggle navigation">
          <span className="text-lg leading-none">{open ? "x" : "="}</span>
        </button>
      </div>
      {open && <nav className="border-t border-slate-200 bg-white px-5 py-3 md:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-1">
          {links.map((link) => <NavLink key={link.to} onClick={() => setOpen(false)} to={link.to} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{link.label}</NavLink>)}
          <button onClick={onThemeToggle} className="theme-toggle mt-2 justify-center" aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} theme`}><span aria-hidden="true" className="theme-toggle-icon">{theme === 'day' ? 'Moon' : 'Sun'}</span><span>{theme === 'day' ? 'Night mode' : 'Day mode'}</span></button>
          <button onClick={() => { setOpen(false); navigate("/roadmap"); }} className="mt-2 rounded-md bg-teal-700 px-3 py-2 text-left text-sm font-bold text-white">Build my plan</button>
        </div>
      </nav>}
    </header>
  );
}
