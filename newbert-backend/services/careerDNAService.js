const { normalizeSkill, skillLabel, normalizeSkillList } = require('./skillNormalizationService');

function safe(v, fallback = null) { return v == null || v === '' ? fallback : v; }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

function extractPracticeProfiles(alumni) {
  const profiles = Array.isArray(alumni.practiceProfiles) ? alumni.practiceProfiles : [];
  const story = alumni.story || {};
  const storyProfiles = Object.entries(story).filter(([k]) => k.startsWith('practice:')).flatMap(([, v]) => Array.isArray(v) ? v : v ? [v] : []);
  const merged = new Map();
  for (const p of [...profiles, ...storyProfiles]) {
    if (!p?.platform) continue;
    const key = p.platform === 'OTHER' ? `OTHER:${(p.platformLabel || '').toLowerCase()}` : p.platform;
    if (!merged.has(key)) merged.set(key, { platform: p.platform, platformLabel: p.platformLabel || p.platform, username: p.username || '', profileUrl: p.profileUrl || '' });
  }
  return [...merged.values()];
}

function extractSkillsAtSelection(alumni) {
  const story = alumni.story || {};
  const raw = story.skillsAtSelection || alumni.skills || [];
  return (Array.isArray(raw) ? raw : []).map(s => {
    const item = typeof s === 'string' ? { name: s } : s;
    const canonical = normalizeSkill(item.name);
    return { name: skillLabel(canonical) || item.name, canonical, category: item.category || 'OTHER', level: item.level || 'INTERMEDIATE', verificationType: 'SENIOR_CONFIRMED' };
  }).filter(s => s.canonical);
}

function extractCoding(alumni) {
  const story = alumni.story || {};
  const dsa = story.dsaPreparation || {};
  const practice = extractPracticeProfiles(alumni);
  const ghProfile = practice.find(p => p.platform === 'GITHUB');
  const github = alumni.github || (ghProfile ? { username: ghProfile.username, profileUrl: ghProfile.profileUrl } : null);
  const cp = practice.filter(p => ['CODEFORCES', 'CODECHEF', 'ATCODER', 'HACKERRANK', 'HACKEREARTH', 'CODE360', 'INTERVIEWBIT'].includes(p.platform));
  return {
    dsa: { solvedAtSelection: num(dsa.solvedAtSelection) ?? num(alumni.dsaSolved), currentSolved: num(dsa.currentSolved), estimated: dsa.estimated || false, primaryLanguage: dsa.primaryLanguage || null, contestRating: num(dsa.contestRating), strongTopics: dsa.strongTopics || [], weakTopics: dsa.weakTopics || [] },
    competitiveProgramming: cp.map(p => ({ platform: p.platform, platformLabel: p.platformLabel, username: p.username, profileUrl: p.profileUrl })),
    github: github ? { username: github.username || '', profileUrl: github.profileUrl || '', publicRepos: num(github.repositories ?? github.publicRepos), languages: github.languages || [], verified: github.verified || false } : null,
  };
}

function extractProjects(alumni) {
  const story = alumni.story || {};
  const raw = story.projects || alumni.projectsDetail || [];
  return (Array.isArray(raw) ? raw : []).map(p => ({
    name: p.name || p.title || 'Project', description: p.description || '', techStack: p.techStack || p.technologies || [], githubUrl: p.githubUrl || '', liveUrl: p.liveUrl || '',
    ownership: p.ownership || null, contribution: p.contribution || '', onResume: p.onResume || false, discussedInInterview: p.discussedInInterview || false, source: p.githubUrl ? 'GITHUB' : 'SENIOR_CONFIRMED',
  }));
}

function extractPreparation(alumni) {
  const story = alumni.story || {};
  const prep = story.preparation || {};
  const phases = story.preparationJourney || [];
  return { months: num(prep.months) ?? num(alumni.preparationMonths), hoursPerDay: num(prep.hoursPerDay), startedIn: prep.startedIn || null, phases: (Array.isArray(phases) ? phases : []).map((p, i) => ({ order: i + 1, title: p.title || `Phase ${i + 1}`, duration: p.duration || '', description: p.description || '' })) };
}

function buildVerificationSummary(alumni) {
  const verification = alumni.verification || {};
  const verifiedFields = Object.entries(verification).filter(([, v]) => v && v !== 'UNVERIFIED').map(([k, v]) => ({ field: k, status: v }));
  return { platformVerifiedFields: verifiedFields.filter(f => ['github', 'leetcode'].includes(f.field)).length, seniorConfirmedFields: verifiedFields.length, totalFields: Object.keys(verification).length };
}

function buildEvidenceSummary(alumni) {
  const skills = extractSkillsAtSelection(alumni);
  const projects = extractProjects(alumni);
  const coding = extractCoding(alumni);
  const strongEvidence = [];
  const goodEvidence = [];
  if (coding.github?.verified) strongEvidence.push({ type: 'GITHUB_VERIFIED', detail: `GitHub ${coding.github.username} verified` });
  if (coding.dsa.solvedAtSelection) goodEvidence.push({ type: 'DSA_COUNT', detail: `${coding.dsa.solvedAtSelection} problems solved at selection` });
  if (projects.length) goodEvidence.push({ type: 'PROJECTS', detail: `${projects.length} projects documented` });
  if (skills.length) goodEvidence.push({ type: 'SKILLS_AT_SELECTION', detail: `${skills.length} skills confirmed at selection` });
  return { strongEvidence, goodEvidence, evidenceFound: [...strongEvidence, ...goodEvidence] };
}

function buildCareerDNA(alumni, options = {}) {
  const story = alumni.story || {};
  const placement = story.placement || alumni.placementOutcome || {};
  const gatePath = ['GATE', 'PSU'].includes(story.careerPath || alumni.path);
  const placementPath = ['PLACEMENT', 'OFF_CAMPUS', 'INTERNSHIP_PPO'].includes(story.careerPath || '');
  return {
    identity: { name: alumni.name || story.name || 'Alumni', college: alumni.college || story.college?.name, branch: alumni.branch || story.branch, batch: alumni.batch || alumni.graduationYear || story.graduationYear, avatarUrl: story.introduction?.avatarUrl || alumni.avatarUrl || '' },
    career: {
      company: placement.company || alumni.company, role: placement.role || alumni.role, package: num(placement.ctc ?? alumni.package),
      outcomeType: gatePath ? 'gate' : placementPath ? 'placement' : 'other', path: gatePath ? 'gate' : placementPath ? 'placement' : 'other',
      careerEvidence: [
        placement.company && { field: 'company', value: placement.company, source: 'SENIOR_CONFIRMED', verificationType: alumni.verification?.placement || 'UNVERIFIED' },
        placement.role && { field: 'role', value: placement.role, source: 'SENIOR_CONFIRMED', verificationType: 'SENIOR_CONFIRMED' },
      ].filter(Boolean),
    },
    coding: extractCoding(alumni),
    skillsAtSelection: extractSkillsAtSelection(alumni),
    currentVerifiedSkills: [], // populated externally when GitHub evidence is fetched
    projects: extractProjects(alumni),
    preparation: extractPreparation(alumni),
    practiceProfiles: extractPracticeProfiles(alumni),
    verificationSummary: buildVerificationSummary(alumni),
    evidenceSummary: buildEvidenceSummary(alumni),
    generatedAt: new Date().toISOString(),
  };
}

function buildCareerDNAComparison(studentProfile, alumniCareerDNA) {
  const studentSkills = normalizeSkillList(studentProfile.skills);
  const seniorSkills = normalizeSkillList(alumniCareerDNA.skillsAtSelection);
  const matched = seniorSkills.filter(s => studentSkills.includes(s));
  const missing = seniorSkills.filter(s => !studentSkills.includes(s));
  const extra = studentSkills.filter(s => !seniorSkills.includes(s));

  const studentDsa = num(studentProfile.leetcodeStats?.totalSolved);
  const seniorDsa = num(alumniCareerDNA.coding?.dsa?.solvedAtSelection);
  const studentProjects = num(Array.isArray(studentProfile.projectDetails) ? studentProfile.projectDetails.length : studentProfile.projects);
  const seniorProjects = num(alumniCareerDNA.projects?.length);

  const dimensions = [
    { key: 'skills', label: 'Skills Overlap', student: { value: matched.length, display: `${matched.length}/${seniorSkills.length || 1}` }, alumni: { value: seniorSkills.length, display: `${seniorSkills.length} skills` } },
    { key: 'dsa', label: 'DSA Solved', student: { value: studentDsa, display: studentDsa != null ? String(studentDsa) : 'N/A' }, alumni: { value: seniorDsa, display: seniorDsa != null ? String(seniorDsa) : 'N/A' } },
    { key: 'projects', label: 'Projects', student: { value: studentProjects, display: studentProjects != null ? String(studentProjects) : 'N/A' }, alumni: { value: seniorProjects, display: seniorProjects != null ? String(seniorProjects) : 'N/A' } },
  ];

  const gaps = [];
  if (seniorDsa != null && (studentDsa == null || studentDsa < seniorDsa)) gaps.push({ area: 'DSA Practice', detail: `Senior solved ${seniorDsa} problems at selection${studentDsa != null ? `, you've solved ${studentDsa}` : ''}` });
  for (const skill of missing.slice(0, 5)) gaps.push({ area: skillLabel(skill), detail: `Senior had ${skillLabel(skill)} at selection time` });
  if (seniorProjects != null && (studentProjects == null || studentProjects < seniorProjects)) gaps.push({ area: 'Projects', detail: `Senior had ${seniorProjects} projects, you have ${studentProjects ?? 0}` });

  const overlapScore = seniorSkills.length ? Math.round((matched.length / seniorSkills.length) * 100) : 0;
  return { dimensions, gaps, matchPercentage: overlapScore, matchedSkills: matched.map(skillLabel), missingSkills: missing.map(skillLabel), studentAdvantages: extra.map(skillLabel) };
}

module.exports = { buildCareerDNA, buildCareerDNAComparison, extractPracticeProfiles };
