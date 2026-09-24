import { useEffect, useState, useCallback } from 'react';
import AnswerFields, { AnswerValue } from './AnswerFields';
import { DetectedAnswerCard } from './OptionComponents';
import { Sparkles } from 'lucide-react';

function emptyValue(q) {
  return ['object', 'privacy', 'college'].includes(q.type)
    ? {}
    : ['projects', 'internships', 'skills', 'interview-rounds', 'timeline', 'resource-list', 'collection', 'multi-choice', 'platform-selector'].includes(q.type)
    ? []
    : '';
}

export default function QuestionRenderer({
  question,
  session,
  scope,
  privacyFields,
  onAnswer,
  onExtract,
  onConfirm,
  onSkip,
  onBack,
  onPracticeCheck,
  onFetchRepos,
  busy,
  returnToReview,
  audience = 'alumni'
}) {
  const q = question;
  const draftKey = `newbert:alumni-draft:${scope}:${q.id}`;

  const [value, setValue] = useState(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      return cached?.version === session?.version ? cached.value : session?.answers?.[q.id] ?? emptyValue(q);
    } catch {
      return session?.answers?.[q.id] ?? emptyValue(q);
    }
  });

  const [mode, setMode] = useState('details');
  const [raw, setRaw] = useState(session?.rawAnswers?.[q.id] && typeof session.rawAnswers[q.id] === 'string' ? session.rawAnswers[q.id] : '');
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [detectedSkills, setDetectedSkills] = useState([]);
  const [confirmedDetected, setConfirmedDetected] = useState(false);

  const pending = session.pendingExtraction?.questionId === q.id ? session.pendingExtraction : null;

  // Persist draft in sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ version: session.version, value }));
    } catch {
      /* Browser storage fallback */
    }
  }, [draftKey, session.version, value]);

  // Fetch GitHub repos & skills if GitHub is known and question requires projects or skills
  useEffect(() => {
    let cancelled = false;
    const ghUser = session?.answers?.['practice:GITHUB']?.username || session?.prefill?.['practice:GITHUB']?.username;
    if (['projects', 'skillsAtSelection', 'platforms'].includes(q.id) && onFetchRepos) {
      onFetchRepos(ghUser)
        .then((res) => {
          if (!cancelled && Array.isArray(res.data?.repositories)) {
            setRepositories(res.data.repositories);
            // Extract detected skills from repo languages and topics
            const detected = new Set();
            res.data.repositories.forEach((repo) => {
              if (repo.language) detected.add(repo.language);
              if (Array.isArray(repo.topics)) repo.topics.forEach((t) => detected.add(t));
            });
            setDetectedSkills(Array.from(detected).map((name) => ({ name, category: 'OTHER', level: 'INTERMEDIATE' })));
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [q.id, onFetchRepos, session]);

  const inspect = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await onPracticeCheck(q.id, value);
      setCheck(data);
    } catch (e) {
      setCheck({ message: e.response?.data?.message || 'The link can still be saved without checking it.' });
    } finally {
      setChecking(false);
    }
  }, [q.id, value, onPracticeCheck]);

  async function submit(event) {
    if (event?.preventDefault) event.preventDefault();
    if (pending) {
      await onConfirm(value);
      return;
    }
    await onAnswer(q.id, value);
  }

  // Check if Newbert detected an answer for this specific question from profile/prefill
  const detectedValue = session?.prefill?.[q.id];
  const showDetectedCard = detectedValue && !confirmedDetected && !session?.answers?.[q.id];

  return (
    <section className="ac-conversation" aria-label={audience === 'student' ? 'Student profile question' : 'Alumni interview question'}>
      {/* Bot Prompt Header */}
      <div className="ac-bot">
        <span className="ac-bot-icon" aria-hidden="true">
          N
        </span>
        <div>
          <p className="ac-kicker">NEWBERT · {q.section}</p>
          <h2 tabIndex={-1}>{q.text}</h2>
          <p>{q.required ? 'Needed for your story' : 'Optional · confirm or select below'}</p>
        </div>
      </div>

      {/* 1. Detected Answer Confirmation Card */}
      {showDetectedCard && (
        <DetectedAnswerCard
          label={`Detected for ${q.id}:`}
          value={detectedValue}
          source="your Newbert profile"
          onConfirm={() => {
            setValue(detectedValue);
            setConfirmedDetected(true);
            onAnswer(q.id, detectedValue);
          }}
          onEdit={() => {
            setConfirmedDetected(true);
          }}
        />
      )}

      {/* AI Extraction Suggestion Confirmation */}
      {pending && (
        <div className="ac-extraction mb-5">
          <p className="ac-kicker">CHECK WHAT I UNDERSTOOD</p>
          <p>Review the details organised from your words:</p>
          <AnswerValue value={pending.answer} />
          {pending.estimatedFields?.length > 0 && <p className="text-xs text-slate-400 mt-2">Estimates: {pending.estimatedFields.join(', ')}</p>}
          <div className="flex gap-2 mt-4">
            <button type="button" className="ac-primary" disabled={busy} onClick={() => onConfirm(pending.answer)}>
              ✓ Correct — keep these details
            </button>
            <button
              type="button"
              className="ac-secondary"
              onClick={() => {
                setValue(pending.answer);
                setMode('details');
              }}
            >
              Edit details
            </button>
          </div>
        </div>
      )}

      {/* Mode toggle for AI-enabled questions */}
      {q.ai && !pending && (
        <div className="ac-mode">
          <button type="button" aria-pressed={mode === 'details'} onClick={() => setMode('details')}>
            Click to select
          </button>
          <button type="button" aria-pressed={mode === 'natural'} onClick={() => setMode('natural')}>
            Tell it in my words (AI)
          </button>
        </div>
      )}

      {/* Natural text mode */}
      {mode === 'natural' && !pending ? (
        <div className="ac-natural space-y-3">
          <textarea
            aria-label="Tell Newbert in your own words"
            rows={5}
            maxLength={6000}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="For example: I joined as a frontend intern at TCS, worked on React and Node.js dashboards, solved around 300 LeetCode problems..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-white"
          />
          <p className="text-xs text-slate-400">Gemini AI will organise this into structured fields. You will confirm before saving.</p>
          <button className="ac-primary" disabled={busy || !raw.trim()} onClick={() => onExtract(q.id, raw)}>
            {busy ? 'Organising your answer…' : 'Organise with AI'}
          </button>
        </div>
      ) : (
        /* Option-First Interactive Form */
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="space-y-5">
            <AnswerFields
              field={q}
              value={value}
              onChange={setValue}
              privacyFields={privacyFields}
              repositories={repositories}
              detectedSkills={detectedSkills}
            />

            {['GITHUB', 'LEETCODE'].includes(q.platform) && (
              <div className="ac-profile-check">
                <button type="button" disabled={checking || !value?.profileUrl} onClick={inspect}>
                  {checking ? 'Checking profile…' : 'Check current public metrics (optional)'}
                </button>
                {check && (
                  <div className="mt-2 text-xs">
                    <p>{check.message}</p>
                    {check.metrics && <AnswerValue value={check.metrics} />}
                  </div>
                )}
              </div>
            )}

            {/* Sticky/Responsive Action Footer */}
            <div className="ac-actions pt-4 border-t border-slate-800">
              <button type="button" onClick={onBack} disabled={busy} className="text-xs font-bold text-slate-400 hover:text-white">
                ← Back
              </button>
              {!q.required && (
                <button type="button" onClick={() => onSkip(q.id)} className="text-xs font-bold text-slate-400 hover:text-white">
                  Skip for now
                </button>
              )}
              <button className="ac-primary !min-h-[44px] !px-6 text-xs font-black" type="submit">
                {busy ? 'Saving...' : returnToReview ? 'Save & review' : pending ? 'Confirm details' : 'Save & continue'} →
              </button>
            </div>
          </fieldset>
        </form>
      )}

      <p className="ac-save-hint text-xs text-slate-500 mt-4">
        {audience === 'guest'
          ? 'Answers save automatically in this browser.'
          : 'Answers save to your account immediately. You can close and resume anytime.'}
      </p>
    </section>
  );
}
