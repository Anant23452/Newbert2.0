import { useEffect, useState } from "react";

const methods = [
  { id: "email", mark: "@", label: "Email" },
  { id: "mobile", mark: "01", label: "Mobile" },
  { id: "apple", mark: "A", label: "Apple" },
  { id: "github", mark: "GH", label: "GitHub" },
];

export default function AuthModal({ isOpen, onClose, onExplore }) {
  const [selectedMethod, setSelectedMethod] = useState("");
  const [mode, setMode] = useState("methods");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectMethod = (method) => {
    if (method === "Email") { setMode("email"); setSelectedMethod(""); return; }
    setSelectedMethod(`${method} sign-in will be available when the account connection is enabled.`);
  };

  return <div className="auth-backdrop fixed inset-0 z-[80] grid place-items-center overflow-y-auto px-5 py-8" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-modal relative w-full max-w-xl border border-white/15 bg-[#191919] p-7 shadow-2xl sm:p-10">
      <button onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center border border-white/10 text-sm font-bold text-slate-400 hover:border-orange-400 hover:text-orange-300" aria-label="Close sign in">x</button>
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-orange-300/30 bg-[#152a3d] text-3xl font-extrabold text-orange-400 shadow-[0_0_38px_rgba(249,115,22,.18)]">N</div>
      <p className="mt-5 text-center text-xs font-extrabold uppercase tracking-[.2em] text-orange-300">Newbert</p>
      <h1 id="auth-title" className="mt-3 text-center text-2xl font-extrabold text-white sm:text-3xl">Sign in to your account</h1>
      <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-slate-400">Keep your preparation, placements, and learning progress in one place.</p>
      {mode === "methods" ? <><button onClick={() => selectMethod("Google")} className="mt-8 flex w-full items-center gap-4 border border-slate-500 bg-[#202124] px-4 py-3.5 text-base font-extrabold text-white transition hover:border-orange-400 hover:bg-[#29251f]"><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-extrabold text-red-500">G</span><span className="flex-1 pr-8 text-center">Sign in with Google</span></button><div className="my-8 flex items-center gap-4"><span className="h-px flex-1 bg-slate-600"/><span className="text-xs font-semibold text-slate-400">or continue with</span><span className="h-px flex-1 bg-slate-600"/></div><div className="grid grid-cols-4 gap-3">{methods.map((method) => <button key={method.id} onClick={() => selectMethod(method.label)} className="group flex flex-col items-center gap-2 text-xs font-semibold text-slate-400 hover:text-orange-300"><span className="grid h-12 w-12 place-items-center rounded-full border border-slate-600 text-xs font-extrabold text-white transition group-hover:border-orange-400 group-hover:bg-orange-400/10">{method.mark}</span>{method.label}</button>)}</div>{selectedMethod && <p className="mt-6 text-center text-xs leading-5 text-orange-200">{selectedMethod}</p>}<p className="mt-9 text-center text-base font-semibold text-slate-200">Continue without signing in? <button onClick={() => { onClose(); onExplore(); }} className="font-extrabold text-orange-400 hover:text-orange-300">Explore</button></p></> : <EmailForm name={name} email={email} setName={setName} setEmail={setEmail} onBack={() => setMode("methods")} onSubmit={() => { if (name.trim() && email.trim()) { localStorage.setItem("newbert-profile", JSON.stringify({ name: name.trim(), email: email.trim() })); onClose(); window.location.assign("/profile"); } }} />}
    </section>
  </div>;
}

function EmailForm({ name, email, setName, setEmail, onBack, onSubmit }) {
  return <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="mt-8"><button type="button" onClick={onBack} className="text-xs font-bold text-orange-300 hover:text-orange-200">Back to sign-in methods</button><label className="mt-5 block text-sm font-bold text-slate-200">Your name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full border border-slate-600 bg-[#202124] px-3 py-3 text-white outline-none placeholder:text-slate-500 focus:border-orange-400" placeholder="Your name" required/></label><label className="mt-4 block text-sm font-bold text-slate-200">Email address<input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full border border-slate-600 bg-[#202124] px-3 py-3 text-white outline-none placeholder:text-slate-500 focus:border-orange-400" type="email" placeholder="you@example.com" required/></label><p className="mt-4 text-xs leading-5 text-slate-500">Next, you will complete your placement profile and connect your public learning accounts.</p><button type="submit" className="mt-6 w-full bg-orange-500 px-4 py-3 text-sm font-extrabold text-[#171918] hover:bg-orange-400">Continue to my profile</button></form>;
}
