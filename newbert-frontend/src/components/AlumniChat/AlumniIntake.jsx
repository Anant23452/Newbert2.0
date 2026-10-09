import { useState } from 'react';
import { Link } from 'react-router-dom';
import ResumeAnswer from './ResumeAnswer';

export default function AlumniIntake({ session, busy, onImport, onConfirm }) {
  const [role, setRole] = useState('');
  const [year, setYear] = useState(session.answers.graduationYear || session.prefill?.graduationYear || '');
  const [links, setLinks] = useState({ linkedin: session.prefill?.socialLinks?.linkedin || '', github: session.prefill?.['practice:GITHUB']?.profileUrl || '', leetcode: session.prefill?.['practice:LEETCODE']?.profileUrl || '' });
  const [resume, setResume] = useState('');
  const [values, setValues] = useState(session.intake?.suggestions || {});
  const [confirmed, setConfirmed] = useState(false);
  const intake = session.intake;
  const update = (key, value) => setValues(previous => ({ ...previous, [key]: value }));
  if (intake) return <section className="ac-welcome">
    <p className="ac-kicker">REVIEW IMPORTED DETAILS</p><h1>Correct what we found.</h1>
    <p>These are suggestions, not verified facts. Current coding activity does not tell us what you knew at graduation or selection.</p>
    {intake.sources?.map((source, i) => <div className="ac-preview" key={i}><strong>{source.type}</strong><p>{source.status}</p>{source.currentSolved != null && <p>Current solved count: {source.currentSolved}</p>}{source.repositories?.map(repo => <p key={repo.url}>{repo.name}{repo.language ? ` · ${repo.language}` : ''}</p>)}</div>)}
    {intake.notes?.map(note => <p role="status" key={note}>{note}</p>)}
    {['name', 'branch', 'degree', 'graduationYear'].filter(key => Object.hasOwn(values, key)).map(key => <label className="block my-3" key={key}>{key === 'graduationYear' ? 'Graduation year' : key}<input className="control w-full" disabled={busy} type={key === 'graduationYear' ? 'number' : 'text'} maxLength={100} value={values[key] || ''} onChange={e => update(key, e.target.value)}/></label>)}
    {values.socialLinks?.linkedin && <label className="block my-3">LinkedIn<input className="control w-full" disabled={busy} value={values.socialLinks.linkedin} onChange={e => update('socialLinks', { linkedin: e.target.value })}/></label>}
    {Object.hasOwn(values, 'resumeBackground') && <label className="block my-3">Correct the project and skills background from your resume<textarea className="control w-full" disabled={busy} rows={5} maxLength={3000} value={values.resumeBackground || ''} onChange={e => update('resumeBackground', e.target.value)}/><span className="text-xs text-slate-400">This shapes follow-up questions. It does not automatically become selection-time skills or project answers.</span></label>}
    {['GITHUB', 'LEETCODE'].filter(platform => values[`practice:${platform}`]).map(platform => <label className="block my-3" key={platform}>{platform} profile<input className="control w-full" disabled={busy} value={values[`practice:${platform}`].profileUrl} onChange={e => update(`practice:${platform}`, { profileUrl: e.target.value })}/></label>)}
    <label className="ac-consent"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)}/>I corrected these details. My completed story answers will be public after I review and publish them.</label>
    <button className="ac-primary" disabled={busy || !confirmed} onClick={() => onConfirm(values)}>{busy ? 'Saving…' : 'Confirm and start my interview'}</button>
  </section>;
  return <section className="ac-welcome">
    <p className="ac-kicker">BEFORE YOUR INTERVIEW</p><h1>Let’s understand your background.</h1>
    <p>Share the profiles you use and optionally a resume. We’ll show what can be imported, let you correct it, then ask questions to complete your story.</p>
    <label className="block my-3">I am a<select className="control w-full" disabled={busy} value={role} onChange={e => setRole(e.target.value)}><option value="">Select student or alumni</option><option value="STUDENT">Student</option><option value="ALUMNI">Alumni</option></select></label>
    {role === 'STUDENT' ? <p>This story interview is for alumni. <Link to="/profile" className="text-orange-400">Open your student profile</Link>.</p> : <>
      <label className="block my-3">Graduation year<input className="control w-full" type="number" min="1950" disabled={busy} value={year} onChange={e => setYear(e.target.value)}/></label>
      {['linkedin', 'github', 'leetcode'].map(key => <label className="block my-3" key={key}>{key === 'leetcode' ? 'LeetCode / coding profile' : key === 'github' ? 'GitHub' : 'LinkedIn'} (optional)<input className="control w-full" disabled={busy} value={links[key]} maxLength={2048} onChange={e => setLinks(previous => ({ ...previous, [key]: e.target.value }))} placeholder={key === 'leetcode' ? 'https://leetcode.com/u/your-name/' : `https://${key}.com/${key === 'linkedin' ? 'in/' : ''}your-name`}/></label>)}
      <ResumeAnswer onUse={setResume} disabled={busy} intake/>
      {resume && <p role="status">Resume text selected for import ({resume.length} characters).</p>}
      <p className="text-xs text-slate-400">Choosing Import sends selected resume text to Newbert and Gemini. Links may be checked against public platform data. Missing or inaccessible profiles do not prevent an interview.</p>
      <p>Your corrected answers become a public story only after you approve publication.</p>
      <button className="ac-primary" disabled={busy || role !== 'ALUMNI' || !year} onClick={() => onImport({ memberType: role, graduationYear: Number(year), ...links, resumeText: resume })}>{busy ? 'Reading your background…' : 'Import and review my details'}</button>
    </>}
  </section>;
}
