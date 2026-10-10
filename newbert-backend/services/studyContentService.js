const catalog = require('../data/academicCatalog.json');
const courses = require('../data/studyVideos.json');
const branches = ['electrical', 'civil', 'information-technology'];
function invalid(message) { const e = new Error(message); e.status = 400; throw e; }
function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) invalid('Check the text fields and their length.');
  return value.trim();
}
function youtubeId(value) {
  let u; try { u = new URL(value); } catch { invalid('Paste a valid YouTube link.'); }
  if (u.protocol !== 'https:' || u.username || u.password) invalid('Use a public HTTPS YouTube link.');
  let id;
  if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
  else if (['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)) id = u.pathname === '/watch' ? u.searchParams.get('v') : /^\/(embed|shorts|live)\/([\w-]{11})$/.exec(u.pathname)?.[2];
  if (!/^[\w-]{11}$/.test(id || '')) invalid('Paste a link to one YouTube video.');
  return id;
}
function publicUrl(value) {
  const v = text(value, 2000, true); let u; try { u = new URL(v); } catch { invalid('Enter a valid resource link.'); }
  if (u.protocol !== 'https:' || u.username || u.password) invalid('Resources need public HTTPS links.');
  return v;
}
function validateSubject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Provide subject details.');
  const id = text(body.id,60,true);
  if (!/^[a-z0-9-]+$/.test(id) || !branches.includes(body.branch)) invalid('Choose a valid branch and subject identifier.');
  const year = Number(body.year), semester = Number(body.semester), scheme = Number(body.scheme || 2022);
  if (![1,2,3,4].includes(year) || ![year*2-1,year*2].includes(semester) || ![2022,2026].includes(scheme)) invalid('Choose a valid year, semester and curriculum.');
  if (!Array.isArray(body.units) || body.units.length !== 5) invalid('Provide five unit headings.');
  if (catalog.subjects.some(s => s.id === id)) invalid('That subject already exists. Choose it from the subject list.');
  return { id, title:text(body.title,200,true), code:text(body.code,40,true), branches:[body.branch], year, semesters:[semester], scheme, kind:'core', units:body.units.map((u,i)=>({number:i+1,title:text(u,200,true)})), source:'newbert', lectureCollection:id };
}
function validateLesson(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Provide lesson details.');
  const videoId = youtubeId(body.url), unit = Number(body.unit), order = Number(body.order || 0), minutes = Number(body.minutes || 0);
  const suggested = require('./lectureUnit').lectureUnit(body.title);
  if (suggested && suggested !== unit && body.unitConfirmed !== true) invalid(`The video title says Unit ${suggested}, but Unit ${unit} is selected. Correct the unit or explicitly confirm this assignment.`);
  if (![1,2,3,4,5].includes(unit) || !Number.isInteger(order) || order < 0 || order > 10000 || !Number.isFinite(minutes) || minutes < 0 || minutes > 1440 || typeof body.published !== 'boolean') invalid('Check unit, duration, order and publication status.');
  const resources = body.resources || [], quiz = body.quiz || [], practice = body.practice || [];
  if (!Array.isArray(practice) || practice.length > 20) invalid('Keep up to 20 written practice questions.');
  if (!Array.isArray(resources) || resources.length > 20 || !Array.isArray(quiz) || quiz.length > 10) invalid('Keep up to 20 resources and 10 quiz questions.');
  const questionIds = new Set();
  return { subjectId:text(body.subjectId,60,true), videoId, unit, order, minutes, published:body.published, title:text(body.title,200,true), summary:text(body.summary || '',4000), mentorName:text(body.mentorName || '',100),
    resources: resources.map(r=>{ if (!r || !['notes','practice','past-paper','other'].includes(r.kind) || (r.format && !['pdf','link'].includes(r.format))) invalid('Choose a resource type and format.'); return {title:text(r.title,150,true),url:publicUrl(r.url),kind:r.kind,format:r.format || 'link'}; }),
    practice: practice.map(q=>{
      if(!q || !['short','long','numerical'].includes(q.type) || typeof q.isPYQ !== 'boolean') invalid('Choose a practice question type and source.');
      if(q._id && (!/^[a-f\d]{24}$/i.test(String(q._id)) || questionIds.has(String(q._id)))) invalid('Practice question identifiers must be valid and unique.');
      if(q._id) questionIds.add(String(q._id));
      const marks=Number(q.marks || 0), year=Number(q.year || 0);
      if(!Number.isInteger(marks) || marks<0 || marks>100) invalid('Marks must be between 0 and 100.');
      if(q.isPYQ && (!Number.isInteger(year) || year<2000 || year>new Date().getFullYear())) invalid('Provide a valid exam year for previous-year questions.');
      return {...(q._id && {_id:String(q._id)}),type:q.type,question:text(q.question,3000,true),solution:text(q.solution,6000,true),marks,isPYQ:q.isPYQ,exam:text(q.exam || '',150,q.isPYQ),year:q.isPYQ?year:0,sourceUrl:q.isPYQ?publicUrl(q.sourceUrl):''};
    }),
    quiz: quiz.map(q=>{ if (!q || !Array.isArray(q.options) || q.options.length !== 4 || !Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) invalid('Each question needs four options and a correct answer.'); return {question:text(q.question,1000,true),options:q.options.map(o=>text(o,500,true)),correct:q.correct,explanation:text(q.explanation,2000,true)}; }) };
}
function baselineLesson(videoId, subjectId) {
  const subject = catalog.subjects.find(s=>s.id === subjectId);
  return subject && courses.find(c=>c.id === subject.lectureCollection)?.lessons.find(l=>l.videoId === videoId);
}
function isLegacyVideo(videoId) { return courses.some(c=>c.lessons.some(l=>l.videoId === videoId)); }
function publicLesson(lesson) { return {...lesson,quiz:(lesson.quiz || []).map(q=>({question:q.question,options:q.options})),practice:(lesson.practice || []).map(q=>({id:String(q._id),type:q.type,question:q.question,marks:q.marks,isPYQ:q.isPYQ,exam:q.exam,year:q.year,sourceUrl:q.sourceUrl}))}; }
module.exports = { catalog, courses, invalid, text, youtubeId, validateSubject, validateLesson, baselineLesson, isLegacyVideo, publicLesson };
