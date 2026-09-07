import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import API from "../Services/api";
import { branches } from "../data/notesCatalog";

const units = Object.entries(branches).flatMap(([id, branch]) => branch.semesters.flatMap((semester) => semester.subjects.flatMap((subject) => subject.units.map((unit, i) => ({ key: `${id}:${semester.id}:${subject.id}:${i + 1}`, label: `${branch.code} / ${semester.label} / ${subject.name} / ${unit}` })))));
const empty = { lectureUrl: "", notesUrl: "", questionsUrl: "", syllabusUrl: "", syllabusVersion: "", summary: "", published: false };
export default function AdminNotes() {
  const [key, setKey] = useState(units[0].key);
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try { const { data } = await API.get("/admin/notes"); setResources(data.resources); setForm(data.resources.find((r) => r.key === key) || empty); }
    catch (err) { setError(err.response?.data?.message || "Unable to load notes administration."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const select = (value) => { setKey(value); setForm(resources.find((r) => r.key === value) || empty); setMessage(""); };
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const { data } = await API.put("/admin/notes", { ...form, key }); setResources((items) => [...items.filter((r) => r.key !== key), data.resource]); setMessage(data.resource.published ? "Resources published." : "Draft saved. Students cannot see it yet."); }
    catch (err) { setMessage(err.response?.data?.message || "Resources were not saved."); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen px-5 py-12 text-slate-900"><div className="mx-auto max-w-3xl"><p className="font-bold text-orange-500">Admin</p><h1 className="mt-3 text-3xl font-bold">Notes resources</h1>{loading ? <p className="mt-6">Loading...</p> : error ? <div role="alert" className="mt-6"><p>{error}</p><button onClick={load} className="mt-3 text-orange-500">Retry</button></div> : <form onSubmit={save} className="mt-8 space-y-5"><label className="block text-sm font-bold">Study unit<select value={key} disabled={busy} onChange={(e) => select(e.target.value)} className="control mt-2 w-full">{units.map((unit) => <option key={unit.key} value={unit.key}>{unit.label}</option>)}</select></label><div className="grid gap-5 sm:grid-cols-2">{[["lectureUrl", "Published YouTube lecture"], ["notesUrl", "Notes PDF or document link"], ["questionsUrl", "Previous-year questions link"], ["syllabusUrl", "Official syllabus link"], ["syllabusVersion", "Syllabus session / version"]].map(([field, label]) => <label key={field} className="block text-sm font-bold">{label}<input type={field.endsWith("Url") ? "url" : "text"} value={form[field] || ""} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="control mt-2 w-full"/></label>)}</div><label className="block text-sm font-bold">Unit summary<textarea rows={4} value={form.summary || ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="control mt-2 w-full"/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })}/>Published to students</label><button disabled={busy} className="inline-flex items-center gap-2 rounded bg-orange-500 px-5 py-3 font-bold text-black disabled:opacity-50"><Save size={17}/>{busy ? "Saving..." : "Save resources"}</button>{message && <p role="status" className="text-sm text-orange-500">{message}</p>}</form>}</div></main>;
}
