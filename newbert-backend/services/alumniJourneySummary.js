// Call only with audience-filtered story data. Never use raw answers or documents.
function buildJourneySummary(story = {}) {
  const lines = [];
  const name = story.name || 'This alumnus';
  if (story.college?.name) lines.push(`${name} studied at ${story.college.name}${story.graduationYear ? ` (class of ${story.graduationYear})` : ''}.`);
  const offer = story.placement;
  if (offer?.company && offer?.role) lines.push(`They reported an offer as ${offer.role} at ${offer.company}${offer.offerYear ? ` in ${offer.offerYear}` : ''}.`);
  else if (story.careerOutcome?.description) lines.push(story.careerOutcome.description);
  if (story.preparation?.months != null) lines.push(`Their reported preparation lasted approximately ${story.preparation.months} months.`);
  const skills = (story.skillsAtSelection || []).map(skill => skill.name).filter(Boolean);
  if (skills.length) lines.push(`Skills they reported at selection: ${skills.join(', ')}.`);
  const projects = (story.projects || []).map(project => project.name).filter(Boolean);
  if (projects.length) lines.push(`Projects they chose to share: ${projects.join(', ')}.`);
  if (story.advice) lines.push(`Their advice: ${story.advice}`);
  return lines.join('\n\n');
}
function buildAudiencePreview(answers, sameCollege = false) {
  const { redactStory, legacyFields } = require('./alumniStoryService');
  const story = redactStory(answers, answers.privacy || {}, sameCollege);
  return { ...legacyFields(story), journeySummary: buildJourneySummary(story) };
}
module.exports = { buildJourneySummary, buildAudiencePreview };
