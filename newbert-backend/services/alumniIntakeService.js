const { cleanText, normalizePractice, safeUrl, invalid } = require('./alumniChatValidation');
const { memberType } = require('./profileCompletionService');
const { questions } = require('../config/alumniQuestions');
const { extractAnswer } = require('./alumniAIService');
const { listUserRepositories } = require('./githubProjectAnalyzerService');
const { getLeetcodeStats } = require('./leetcodeService');

function alumniYear(year, now = new Date()) {
  const value = Number(year);
  return Number.isInteger(value) && value >= 1950 && memberType({ collegeId: 'eligibility', graduationYear: value }, now) === 'SENIOR';
}
function requireAlumniInput(input, profile) {
  if (input.memberType !== 'ALUMNI') invalid('This interview is for alumni. Students can use their student profile.');
  if (!alumniYear(input.graduationYear) || (profile?.graduationYear && !alumniYear(profile.graduationYear))) invalid('Current students cannot submit an alumni story.');
}
async function prepareIntake(input, profile, providers = {}) {
  requireAlumniInput(input, profile);
  const suggestions = { graduationYear: Number(input.graduationYear), platforms: [] };
  const notes = [];
  const sources = [];
  if (input.linkedin) {
    const url = safeUrl(input.linkedin);
    if (!['linkedin.com', 'www.linkedin.com'].includes(new URL(url).hostname) || !new URL(url).pathname.startsWith('/in/')) invalid('Use your LinkedIn profile link, for example linkedin.com/in/your-name.');
    suggestions.socialLinks = { linkedin: url };
    sources.push({ type: 'LinkedIn', status: 'Link supplied; profile contents not imported' });
  }
  const jobs = [];
  for (const [field, platform] of [['github', 'GITHUB'], ['leetcode', 'LEETCODE']]) {
    if (!input[field]) continue;
    const link = normalizePractice(platform, { profileUrl: input[field] });
    const path = new URL(link.profileUrl).pathname.split('/').filter(Boolean);
    if ((platform === 'GITHUB' && (path.length !== 1 || !/^[a-zA-Z0-9-]{1,39}$/.test(link.username))) || (platform === 'LEETCODE' && !((path.length === 1 || path.length === 2 && path[0] === 'u') && /^[a-zA-Z0-9_-]{1,100}$/.test(link.username)))) invalid(`Use your ${platform} user profile, not a project or problem link.`);
    suggestions.platforms.push(platform);
    suggestions[`practice:${platform}`] = link;
    if (platform === 'GITHUB') jobs.push((async () => {
      try {
        const repositories = await (providers.repositories || listUserRepositories)(link.username);
        // Current repository metadata is context, never proof of selection-time skills.
        sources.push({ type: 'GitHub', status: 'Current public repositories fetched', repositories: repositories.filter(r => !r.isPrivate).slice(0, 5).map(r => ({ name: r.name, description: r.description, url: r.url, language: r.language })) });
      } catch { notes.push('GitHub could not be read. Your link can still be saved.'); }
    })());
    else jobs.push((async () => {
      try {
        const stats = await (providers.leetcode || getLeetcodeStats)(link.username, [new Date().getFullYear()]);
        sources.push({ type: 'LeetCode', status: 'Current public metrics fetched', currentSolved: stats.totalSolved ?? null });
      } catch { notes.push('LeetCode could not be read. Your link can still be saved.'); }
    })());
  }
  const resume = cleanText(input.resumeText || '', 6000);
  if (resume) jobs.push((async () => {
    try {
      const question = { id: 'resumeIntake', text: 'Extract stated name and education. In resumeBackground summarise explicitly listed projects, technologies and responsibilities as resume claims. Do not infer graduation year, proficiency, ownership, employment verification, or what was known at selection.', type: 'object', fields: [...questions.filter(q => ['name', 'branch', 'degree'].includes(q.id)).map(q => ({ ...q, label: q.text, required: false })), { id: 'resumeBackground', label: 'Resume project and skills background', type: 'textarea', maxLength: 3000 }] };
      const result = await (providers.extract || extractAnswer)(question, resume);
      Object.assign(suggestions, result.answer);
      sources.push({ type: 'Resume', status: 'Suggested education/name details; requires your confirmation' });
    } catch { notes.push('AI could not read the resume. You can enter your details directly.'); }
  })());
  await Promise.all(jobs);
  return { suggestions, sources, notes, resumeText: resume };
}
function confirmIntake(session, values) {
  if (!session.intake || !values || typeof values !== 'object' || Array.isArray(values)) invalid('Review your imported details first.');
  const engine = require('./alumniQuestionEngine');
  if (!alumniYear(values.graduationYear)) invalid('Students cannot submit an alumni story.');
  session.publicStory = true;
  for (const id of Object.keys(session.intake.suggestions)) {
    if (!Object.hasOwn(values, id)) continue;
    const question = engine.relevantQuestions({ ...session.answers, ...values }, true).find(q => q.id === id);
    if (!question) continue;
    const value = engine.validatedAnswer(question, values[id]);
    if (value !== null) session.answers = { ...session.answers, [id]: value };
  }
  session.rawAnswers = { ...session.rawAnswers, ...(session.intake.resumeText ? { resumeIntake: session.intake.resumeText } : {}) };
  session.intakeConfirmed = true;
  session.intake.confirmedBackground = cleanText(values.resumeBackground || '', 3000);
  session.intake.sources = (session.intake.sources || []).filter(source => {
    const platform = source.type === 'GitHub' ? 'GITHUB' : source.type === 'LeetCode' ? 'LEETCODE' : null;
    if (!platform) return true;
    return session.answers[`practice:${platform}`]?.profileUrl === session.intake.suggestions[`practice:${platform}`]?.profileUrl;
  });
  session.markModified?.('intake');
  engine.reconcile(session);
}
function storyForReview(session) {
  if (!session.publicStory) return session.answers;
  const { privacyFields } = require('./alumniStoryService');
  return { ...session.answers, privacy: Object.fromEntries(privacyFields(session.answers).map(f => [f.key, 'PUBLIC'])) };
}
module.exports = { alumniYear, requireAlumniInput, prepareIntake, confirmIntake, storyForReview };
