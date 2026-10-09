import { useEffect, useRef, useState } from 'react';
import { readResumeText } from '../../utils/alumniInterview';

export default function ResumeAnswer({ onUse, disabled, intake = false }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const version = useRef(0);
  useEffect(() => () => { version.current++; }, []);
  async function read(file) {
    const attempt = ++version.current;
    setBusy(true); setError(''); setText('');
    try { const result = await readResumeText(file); if (attempt === version.current) setText(result); }
    catch (err) { if (attempt === version.current) setError(err.message); }
    finally { if (attempt === version.current) setBusy(false); }
  }
  return <details className="ac-evidence">
    <summary>{intake ? 'Upload a resume to prepare your interview (optional)' : 'Use a resume to help recall your projects or skills'}</summary>
    <p className="text-xs text-slate-400">The file is read in your browser. Remove personal contact details and keep the relevant background. {intake ? 'Selecting the text prepares the draft; Import sends it to Newbert and Gemini.' : 'The selected text is sent to Newbert and its AI provider only when you choose Organise with AI.'} A resume is self-reported evidence, not verification.</p>
    <input aria-label="Read resume for this answer" type="file" accept=".pdf,.txt" disabled={disabled || busy} onChange={e => { const file = e.target.files?.[0]; if (file) void read(file); e.target.value = ''; }}/>
    {busy && <p role="status">Reading your resume…</p>}
    {error && <p role="alert">{error}</p>}
    {text && <><label>Keep only the relevant section (up to 6,000 characters)<textarea rows={6} value={text} disabled={disabled} onChange={e => setText(e.target.value)}/></label>
      <p role="status">{text.length} characters selected</p>
      <button type="button" className="ac-secondary" disabled={disabled || !text.trim() || text.length > 6000} onClick={() => onUse(text.trim())}>Use this text as my draft answer</button></>}
  </details>;
}
