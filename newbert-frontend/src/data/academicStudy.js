import catalog from './academicCatalog.json';
import { studyCourses, studyHref } from './studyCatalog';
import { academicUnitKey } from '../utils/academicYear';

export const academicCatalog = catalog;
const baselineSubjects = [...catalog.subjects];
const baselineCourses = JSON.parse(JSON.stringify(studyCourses));
let managedLessons = [];
let overrides = [];
export function setManagedStudyContent(data) {
  catalog.subjects = [...baselineSubjects];
  studyCourses.splice(0, studyCourses.length, ...JSON.parse(JSON.stringify(baselineCourses)));
  managedLessons = data.lessons || [];
  overrides = data.overrides || [];
  catalog.sources.newbert = { url: '/study', edition: 'Newbert', managed: true };
  for (const subject of data.subjects || []) {
    const index = catalog.subjects.findIndex(s => s.id === subject.id);
    if (index < 0) catalog.subjects.push(subject);
    else catalog.subjects[index] = subject;
  }
  for (const subject of catalog.subjects) {
    const published = managedLessons.filter(l => l.subjectId === subject.id);
    if (!published.length) continue;
    let course = studyCourses.find(c => c.id === subject.lectureCollection);
    if (!course) {
      course = { id: subject.lectureCollection, title: subject.title, audience: `Year ${subject.year}`, branch: subject.branches[0], playlistUrl: 'https://www.youtube.com/@newbert2025', lessons: [] };
      studyCourses.push(course);
    }
    for (const lesson of published) {
      const item = { ...lesson, url: `https://www.youtube.com/watch?v=${lesson.videoId}` };
      const index = course.lessons.findIndex(l => l.videoId === lesson.videoId);
      if (index < 0) course.lessons.push(item); else course.lessons[index] = item;
    }
  }
  for (const course of studyCourses) {
    const mappings = catalog.subjects.filter(s => s.lectureCollection === course.id);
    course.lessons = course.lessons.filter(l => l.subjectId || !mappings.length || !mappings.every(s => overrides.some(o => o.subjectId === s.id && o.videoId === l.videoId)));
    course.lessons.sort((a,b) => (a.order || 0) - (b.order || 0));
  }
}
export const findSubject = (branch, id) => catalog.subjects.find(s => s.id === id && s.branches.includes(branch));
export const hasPublishedVideos = subject => subject.units.some(unit => lessonsForUnit(subject, unit.number).length > 0);
export const subjectsFor = (branch, year, semester, scheme = 2022) => catalog.subjects.filter(s => s.branches.includes(branch) && s.year === year && s.semesters.includes(semester) && (year !== 1 || s.scheme === scheme) && hasPublishedVideos(s));
export const lessonsForUnit = (subject, number) => {
  const hidden = overrides.filter(o => o.subjectId === subject.id).map(o => o.videoId);
  const baseline = (baselineCourses.find(c => c.id === subject.lectureCollection)?.lessons || []).filter(l => l.unit === number && !hidden.includes(l.videoId));
  const managed = managedLessons.filter(l => l.subjectId === subject.id && l.unit === number).map(l => ({ ...l, url: `https://www.youtube.com/watch?v=${l.videoId}` }));
  return [...baseline, ...managed].sort((a,b) => (a.order || 0) - (b.order || 0));
};
export function studyRecordTitle(key) {
  const parts = key?.split(':') || [];
  if (parts[0] === 'unit') {
    const subject = findSubject(parts[1], parts[2]);
    return subject && hasPublishedVideos(subject) ? `${subject.title} · Unit ${parts[3]}` : null;
  }
  if (parts[0] === 'lecture') return studyCourses.find(c => c.id === parts[1] && c.lessons.some(l => l.videoId === parts[2]))?.title || null;
  return null;
}
export function subjectProgress(branch, subject, records) {
  return subject.units.filter(u => records.some(r => r.key === academicUnitKey(branch, subject.id, u.number) && r.completed)).length;
}
export function resumableRecords(records) {
  return records.filter(r => studyRecordTitle(r.key)).sort((a,b) => new Date(b.lastViewedAt || 0) - new Date(a.lastViewedAt || 0));
}
export const resumeHref = record => studyHref(record?.key);
