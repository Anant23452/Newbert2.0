import { useState } from 'react';
import { AnswerValue } from './AnswerFields';
import API from '../../Services/api';
import { Sparkles, Check, Edit3 } from 'lucide-react';

export default function AlumniReview({ session, onEdit, onPublish, onContinue, busy, preview }) {
  const [confirmed, setConfirmed] = useState(false);
  const [audience, setAudience] = useState('public');

  const answers = session?.answers || {};
  const name = answers.name || 'Alumni';
  const college = answers.college?.name || '';
  const branch = answers.branch || '';
  const batch = answers.graduationYear || '';
  const placement = answers.placement || {};
  const dsa = answers.dsaPreparation || {};
  const skills = Array.isArray(answers.skillsAtSelection) ? answers.skillsAtSelection : [];
  const projects = Array.isArray(answers.projects) ? answers.projects : [];
  const prep = answers.preparation || {};

  return (
    <section className="ac-review">
      <p className="ac-kicker">STEP 25 · FINAL REVIEW</p>
      <h1>Make sure it feels like you.</h1>
      <p>Review your answers and choose what juniors can see. Publishing is your approval to share on Newbert.</p>

      {/* Clean Structured Summary Card */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 my-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">{name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{branch} · {college} · Class of {batch}</p>
            {placement.company && (
              <p className="text-sm font-semibold text-orange-400 mt-1">
                {placement.role} @ {placement.company} {placement.ctc ? `· ${placement.ctc} LPA` : ''}
              </p>
            )}
          </div>
          <span className="rounded-full bg-orange-500/15 border border-orange-500/30 px-3 py-1 text-xs font-bold text-orange-400 shrink-0">
            Summary
          </span>
        </div>

        <div className="border-t border-slate-700/80 pt-4 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">At Selection Time</p>
          <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
            {dsa.solvedAtSelection != null && (
              <div><span className="text-slate-400">DSA Solved:</span> <strong className="text-white">~{dsa.solvedAtSelection} problems</strong></div>
            )}
            {dsa.primaryLanguage && (
              <div><span className="text-slate-400">DSA Language:</span> <strong className="text-white">{dsa.primaryLanguage}</strong></div>
            )}
            {dsa.strongTopics?.length > 0 && (
              <div className="sm:col-span-2"><span className="text-slate-400">Strong Topics:</span> <strong className="text-white">{dsa.strongTopics.join(', ')}</strong></div>
            )}
            {skills.length > 0 && (
              <div className="sm:col-span-2"><span className="text-slate-400">Skills at Selection:</span> <strong className="text-white">{skills.map(s => s.name || s).join(', ')}</strong></div>
            )}
            {projects.length > 0 && (
              <div className="sm:col-span-2"><span className="text-slate-400">Projects:</span> <strong className="text-white">{projects.map(p => p.name).join(', ')}</strong></div>
            )}
            {prep.months && (
              <div><span className="text-slate-400">Preparation Time:</span> <strong className="text-white">{prep.months} months</strong></div>
            )}
          </div>
        </div>
      </div>

      <details className="ac-preview">
        <summary>Preview what readers can see (Public vs College)</summary>
        <div className="ac-choices mt-3 mb-3">
          <button type="button" aria-pressed={audience === 'public'} onClick={() => setAudience('public')}>
            Public View
          </button>
          <button type="button" aria-pressed={audience === 'college'} onClick={() => setAudience('college')}>
            College Only View
          </button>
        </div>
        {preview?.[audience] ? <AnswerValue value={preview[audience]} /> : <p className="text-xs text-slate-400">Open review again to refresh this preview.</p>}
      </details>

      {session.missingRequired?.length > 0 && (
        <p className="ac-alert">
          {session.missingRequired.length} required answer{session.missingRequired.length > 1 ? 's' : ''} left. Complete them before publishing.
        </p>
      )}

      {session.pendingExtraction && (
        <p className="ac-alert">Review the pending AI suggestion before publishing.</p>
      )}

      {/* Questions list with Edit buttons */}
      <div className="space-y-4 my-6">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Detailed Answers</h3>
        {session.questions.map((q) => (
          <article key={q.id} className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-4">
            <div className="ac-review-heading">
              <div>
                <small className="text-slate-400 font-bold text-[10px] uppercase">
                  {q.section} {q.required ? '· Required' : ''}
                </small>
                <h4 className="text-sm font-bold text-white mt-1">{q.text}</h4>
              </div>
              <button className="ac-secondary !min-h-[34px] !py-1 !px-3 text-xs" disabled={busy} onClick={() => onEdit(q)}>
                Edit
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-300">
              {Object.hasOwn(session.answers, q.id) ? (
                <AnswerValue value={session.answers[q.id]} />
              ) : (
                <p className="text-slate-500 italic">
                  {session.skippedQuestions?.includes(q.id) ? 'Skipped — optional' : 'Not answered yet'}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      <label className="ac-consent cursor-pointer">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="accent-orange-500 rounded" />
        <span className="text-xs text-slate-300">
          I reviewed my story and privacy settings. Publish the information I chose to share on Newbert Alumni Network.
        </span>
      </label>

      <div className="ac-actions pt-4 border-t border-slate-800">
        <button type="button" className="ac-secondary !min-h-[44px] !px-5 text-xs font-bold" onClick={onContinue}>
          Save as Draft & Continue
        </button>
        <button
          className="ac-primary !min-h-[44px] !px-6 text-xs font-black"
          disabled={busy || !confirmed || !session.canPublish}
          onClick={onPublish}
        >
          {busy ? 'Publishing your story…' : 'Publish Alumni Story'}
        </button>
      </div>
    </section>
  );
}

export function PrivateEvidence() {
  const [file, setFile] = useState(null);
  const [source, setSource] = useState('OFFER_LETTER');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Choose a file smaller than 2 MB.');
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data } = await API.post('/alumni-chat/documents', { source, filename: file.name, base64 });
      setMessage(data.message);
      setFile(null);
    } catch (e) {
      setMessage(e.response?.data?.message || e.message || 'Evidence could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="ac-evidence mt-4">
      <summary className="text-xs text-orange-400 font-bold cursor-pointer">Optional private evidence (offer letter, ID, scorecard)</summary>
      <p className="text-xs text-slate-400 mt-2">Documents are stored privately for review. They never appear on the Alumni Wall.</p>
      <label className="block text-xs font-bold text-slate-300 mt-3">
        Evidence type
        <select value={source} onChange={(e) => setSource(e.target.value)} className="mt-1 block w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs text-white">
          {['OFFER_LETTER', 'EMPLOYEE_ID', 'GATE_SCORECARD', 'COLLEGE_RECORD', 'COMPANY_EMAIL', 'OTHER'].map((v) => (
            <option key={v} value={v}>
              {v.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <input
        aria-label="Private verification document"
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mt-3 block w-full text-xs text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-orange-500/20 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-orange-400"
      />
      <button className="ac-secondary mt-3 !min-h-[36px] text-xs font-bold" disabled={busy || !file} onClick={upload}>
        {busy ? 'Saving privately…' : 'Save private evidence'}
      </button>
      {message && <p role="status" className="text-xs text-green-400 mt-2">{message}</p>}
    </details>
  );
}
