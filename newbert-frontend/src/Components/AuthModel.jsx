import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import API from "../Services/api";
import useAuth from "../hook/useAuth";

export default function AuthModal({ isOpen, onClose, onExplore }) {
  const navigate = useNavigate();
  const { completeAuthentication } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (!isOpen) return; const close = (event) => event.key === "Escape" && onClose(); document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [isOpen, onClose]);
  if (!isOpen) return null;
  const complete = async ({ data }) => {
    const savedProfile = await completeAuthentication(data);
    onClose();
    navigate(savedProfile?.onboardingCompleted ? "/profile" : "/complete-profile", { replace: true });
  };
  const emailAuth = async (event) => { event.preventDefault(); setError(""); setLoading(true); try { const { data } = await API.post(`/auth/${mode === "register" ? "register" : "login"}`, mode === "register" ? { name, email, password } : { email, password }); await complete({ data }); } catch (err) { setError(err.response?.data?.message || "Unable to sign in. Please try again."); } finally { setLoading(false); } };
  const googleAuth = async (credential) => { setError(""); if (!credential) return setError("Google did not return a credential. Please try again."); setLoading(true); try { await complete(await API.post("/auth/google", { credential })); } catch (err) { setError(err.response?.data?.message || "Google sign-in failed. Check the backend connection and try again."); } finally { setLoading(false); } };
  return <div className="auth-backdrop fixed inset-0 z-[80] grid place-items-center overflow-y-auto px-5 py-8" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="auth-modal relative w-full max-w-xl border border-white/15 bg-[#191919] p-7 shadow-2xl sm:p-10"><button onClick={onClose} className="absolute right-4 top-4 text-slate-400" aria-label="Close sign in">×</button><p className="text-center text-xs font-extrabold uppercase tracking-[.2em] text-orange-300">Newbert</p><h1 className="mt-3 text-center text-2xl font-extrabold text-white">{mode === "register" ? "Create your account" : "Sign in to your account"}</h1><div className="mt-8 flex justify-center"><GoogleLogin onSuccess={(response) => googleAuth(response.credential)} onError={() => setError("Google sign-in was cancelled or unavailable.")} /></div><div className="my-6 flex items-center gap-4"><span className="h-px flex-1 bg-slate-600"/><span className="text-xs text-slate-400">or use email</span><span className="h-px flex-1 bg-slate-600"/></div><form onSubmit={emailAuth}>{mode === "register" && <label className="block text-sm font-bold text-slate-200">Name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full border border-slate-600 bg-[#202124] p-3 text-white" required/></label>}<label className="mt-4 block text-sm font-bold text-slate-200">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full border border-slate-600 bg-[#202124] p-3 text-white" required/></label><label className="mt-4 block text-sm font-bold text-slate-200">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength="8" className="mt-2 w-full border border-slate-600 bg-[#202124] p-3 text-white" required/></label>{error && <p className="mt-4 text-sm text-red-300">{error}</p>}<button disabled={loading} className="mt-6 w-full bg-orange-500 p-3 font-extrabold text-[#171918] disabled:opacity-60">{loading ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}</button></form><p className="mt-6 text-center text-sm text-slate-300">{mode === "register" ? "Already have an account?" : "New to Newbert?"} <button onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }} className="font-bold text-orange-400">{mode === "register" ? "Sign in" : "Create account"}</button></p><p className="mt-5 text-center text-sm text-slate-400">Continue without signing in? <button onClick={() => { onClose(); onExplore(); }} className="font-bold text-orange-400">Explore</button></p></section></div>;
}
