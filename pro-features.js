/* Pro learning system — struggle tracking, spaced revision, pattern weakness */
const META_KEY = 'dsacrack_meta_v3';

const MISTAKE_TAGS = [
  { id: 'pattern', label: 'Wrong pattern' },
  { id: 'edge', label: 'Edge cases' },
  { id: 'logic', label: 'Logic bug' },
  { id: 'complexity', label: 'Complexity' },
  { id: 'syntax', label: 'Implementation' },
  { id: 'overflow', label: 'Bounds/overflow' }
];

const INTERVIEW_CHECKLIST = [
  'Restate problem & constraints in your own words',
  'Ask clarifying questions (input size, sorted?, duplicates?)',
  'Name pattern BEFORE coding (30 sec)',
  'Brute force → then optimize with complexity tradeoff',
  'Dry-run on a non-trivial example',
  'State time & space complexity',
  'Mention 2 edge cases aloud'
];

const REVISION_INTERVALS = { 0: 7, 1: 4, 2: 2, 3: 1 }; // days by struggle level

let meta = {};
try { meta = JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch (e) { meta = {}; }

function qKey(patId, qName) { return patId + '::' + qName; }

function getMeta(patId, qName) {
  const k = qKey(patId, qName);
  return meta[k] || { struggle: 0, interval: 0, nextReview: 0, reviews: 0, mistakes: [], note: '', blind: false };
}

function setMeta(patId, qName, patch) {
  const k = qKey(patId, qName);
  meta[k] = { ...getMeta(patId, qName), ...patch };
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function saveMeta() { localStorage.setItem(META_KEY, JSON.stringify(meta)); }

function setStruggle(patId, qName, level) {
  setMeta(patId, qName, { struggle: level, lastRated: Date.now() });
  if (level >= 1) scheduleReview(patId, qName, level);
  buildAll();
  renderInsights();
}

function scheduleReview(patId, qName, struggleLevel) {
  const days = REVISION_INTERVALS[struggleLevel] ?? 7;
  const interval = days * 86400000;
  setMeta(patId, qName, {
    interval: days,
    nextReview: Date.now() + interval,
    reviews: getMeta(patId, qName).reviews || 0
  });
}

function onMarkDone(patId, qName) {
  const m = getMeta(patId, qName);
  const s = m.struggle || 0;
  scheduleReview(patId, qName, s);
  setMeta(patId, qName, { solvedAt: Date.now(), lastAttempt: Date.now() });
}

function completeReview(patId, qName, quality) {
  const m = getMeta(patId, qName);
  let days = m.interval || 7;
  if (quality === 'easy') days = Math.min(90, Math.max(days * 2, 7));
  else if (quality === 'good') days = Math.min(60, Math.max(days * 1.5, 4));
  else days = 1;
  setMeta(patId, qName, {
    interval: days,
    nextReview: Date.now() + days * 86400000,
    reviews: (m.reviews || 0) + 1,
    lastReview: Date.now()
  });
  buildAll();
  renderInsights();
}

function formatReviewDue(ts) {
  if (!ts) return { label: '—', cls: 'rev-none', overdue: false };
  const now = Date.now();
  const diff = ts - now;
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { label: 'Due now', cls: 'rev-overdue', overdue: true };
  if (days === 0) return { label: 'Today', cls: 'rev-today', overdue: true };
  if (days === 1) return { label: 'Tomorrow', cls: 'rev-soon', overdue: false };
  return { label: days + 'd', cls: 'rev-ok', overdue: false };
}

function generateRevisionPlan(p, q) {
  const m = getMeta(p.id, q.name);
  const due = formatReviewDue(m.nextReview);
  const struggleLabel = ['Not rated', 'Mild friction', 'Struggled', 'Blocked'][m.struggle] || 'Not rated';
  const steps = [
    '<strong>1. Active recall (5 min, no IDE):</strong> Write pattern name + 3-line pseudocode from memory.',
    '<strong>2. Trigger drill:</strong> ' + (p.when || '').replace('🎯 Trigger:', '').trim(),
    '<strong>3. Re-solve:</strong> Code on LeetCode timed (25 min). If stuck &gt;10 min, read hint only.',
    '<strong>4. Post-mortem:</strong> Log mistake tags + one sentence “what I missed”.',
    '<strong>5. Teach it:</strong> Explain solution aloud in 60 sec (Feynman technique).'
  ];
  const intervalNote = m.interval
    ? `Spaced repetition: review again in <strong>${m.interval}</strong> day(s) (${due.label}). After 3 strong recalls → stretch to 30+ days.`
    : 'Mark struggle level or solve to start spaced repetition schedule.';
  return `
    <div class="rev-plan">
      <div class="rev-plan-head">
        <span class="rev-badge ${due.cls}">📅 ${due.label}</span>
        <span class="struggle-pill s-${m.struggle}">${struggleLabel}</span>
      </div>
      <p class="rev-interval">${intervalNote}</p>
      <ol class="rev-steps">${steps.map(s => '<li>' + s + '</li>').join('')}</ol>
      <div class="rev-senior"><strong>Senior habit:</strong> ${INTERVIEW_CHECKLIST[2]} — then ${INTERVIEW_CHECKLIST[5]}</div>
    </div>`;
}

function computePatternStats() {
  return PATTERNS.map(p => {
    let struggleSum = 0, struggleCount = 0, highStruggle = 0, due = 0, solved = 0;
    p.questions.forEach(q => {
      const k = qKey(p.id, q.name);
      const m = getMeta(p.id, q.name);
      if (done[k]) solved++;
      if (m.struggle >= 2) highStruggle++;
      if (m.struggle > 0) { struggleSum += m.struggle; struggleCount++; }
      const d = formatReviewDue(m.nextReview);
      if (d.overdue && m.nextReview) due++;
    });
    const n = p.questions.length;
    const weakness = n
      ? Math.round((highStruggle * 3 + struggleSum) / n * 10 + (1 - solved / n) * 30)
      : 0;
    return { ...p, solved, n, highStruggle, due, weakness: Math.min(100, weakness) };
  }).sort((a, b) => b.weakness - a.weakness);
}

function getAllQuestionsFlat() {
  const list = [];
  PATTERNS.forEach(p => p.questions.forEach(q => list.push({ p, q, key: qKey(p.id, q.name) })));
  return list;
}

function getDueQuestions() {
  const now = Date.now();
  return getAllQuestionsFlat()
    .filter(({ p, q }) => {
      const m = getMeta(p.id, q.name);
      return m.nextReview && m.nextReview <= now + 86400000;
    })
    .sort((a, b) => (getMeta(a.p.id, a.q.name).nextReview || 0) - (getMeta(b.p.id, b.q.name).nextReview || 0));
}

function getStrugglingQuestions() {
  return getAllQuestionsFlat().filter(({ p, q }) => getMeta(p.id, q.name).struggle >= 2);
}

function renderInsights() {
  const el = document.getElementById('insightsPanel');
  if (!el) return;
  const stats = computePatternStats();
  const due = getDueQuestions();
  const struggling = getStrugglingQuestions();
  const topWeak = stats.filter(s => s.weakness > 15).slice(0, 5);

  document.getElementById('dueCount').textContent = due.length;
  document.getElementById('struggleCount').textContent = struggling.length;
  document.getElementById('focusPattern').textContent = topWeak[0]?.name || '—';

  const weakHtml = topWeak.length
    ? topWeak.map(s => `
      <div class="weak-row" onclick="scrollToPattern('${s.id}')">
        <span class="weak-name">${s.icon} ${s.name}</span>
        <div class="weak-bar-wrap"><div class="weak-bar" style="width:${s.weakness}%;background:${s.color}"></div></div>
        <span class="weak-score">${s.weakness}%</span>
        <span class="weak-meta">${s.highStruggle} hard · ${s.due} due</span>
      </div>`).join('')
    : '<p class="weak-empty">Rate struggle on questions (😓/🔥) to unlock pattern weakness map.</p>';

  document.getElementById('weakPatternsList').innerHTML = weakHtml;

  const dueHtml = due.length
    ? due.slice(0, 8).map(({ p, q }) => {
        const m = getMeta(p.id, q.name);
        const d = formatReviewDue(m.nextReview);
        const enc = encodeURIComponent(q.name);
        return `<button type="button" class="due-chip" onclick="openRevise('${p.id}',decodeURIComponent('${enc}'))">${q.name} <span class="${d.cls}">${d.label}</span></button>`;
      }).join('') + (due.length > 8 ? `<span class="due-more">+${due.length - 8} more — filter “Due Review”</span>` : '')
    : '<p class="weak-empty">No reviews due. Solve & rate struggle to schedule spaced repetition.</p>';

  document.getElementById('dueList').innerHTML = dueHtml;
}

function scrollToPattern(id) {
  const sec = document.getElementById('pat-' + id);
  if (sec) { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); sec.classList.add('open'); }
}

function openRevise(patId, qName) {
  scrollToPattern(patId);
  setTimeout(() => {
    const k = qKey(patId, qName);
    const did = typeof rowId === 'function' ? rowId(k).replace('row-', 'detail-') : null;
    if (did && document.getElementById(did)) {
      document.getElementById(did).classList.add('visible');
      document.getElementById(did).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 300);
}

function toggleMistake(patId, qName, tagId, btn) {
  const m = getMeta(patId, qName);
  const mistakes = m.mistakes || [];
  const i = mistakes.indexOf(tagId);
  if (i >= 0) mistakes.splice(i, 1); else mistakes.push(tagId);
  setMeta(patId, qName, { mistakes });
  btn.classList.toggle('active');
}

function saveNote(patId, qName, val) {
  setMeta(patId, qName, { note: val });
}

function toggleBlind(patId, qName) {
  const m = getMeta(patId, qName);
  setMeta(patId, qName, { blind: !m.blind });
  buildAll();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ done, meta, streak: streakData, exported: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dsacrack-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
}

function importProgress(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (data.done) { done = data.done; localStorage.setItem(STORAGE_KEY, JSON.stringify(done)); }
      if (data.meta) { meta = data.meta; saveMeta(); }
      if (data.streak) { streakData = data.streak; localStorage.setItem('dsacrack_streak', JSON.stringify(streakData)); saveStreak(); }
      buildAll();
      renderInsights();
      alert('Progress imported successfully.');
    } catch (e) { alert('Invalid backup file.'); }
  };
  r.readAsText(file);
}

function toggleInsights() {
  const panel = document.getElementById('insightsPanel');
  panel.classList.toggle('collapsed');
  const ch = document.getElementById('insightsChevron');
  if (ch) ch.style.transform = panel.classList.contains('collapsed') ? '' : 'rotate(180deg)';
}
