import catalog from './academicCatalog.json';
import { studyCourses, studyHref } from './studyCatalog';
import { academicUnitKey } from '../utils/academicYear';

export const academicCatalog = catalog;
export const findSubject = (branch, id) => catalog.subjects.find(s => s.id === id && s.branches.includes(branch));
export const subjectsFor = (branch, year, semester, scheme = 2022) => catalog.subjects.filter(s => s.branches.includes(branch) && s.year === year && s.semesters.includes(semester) && (year !== 1 || s.scheme === scheme));
export const lessonsForUnit = (subject, number) => studyCourses.find(c => c.id === subject.lectureCollection)?.lessons.filter(l => l.unit === number) || [];
export function studyRecordTitle(key) {
  const parts = key?.split(':') || [];
  if (parts[0] === 'unit') {
    const subject = findSubject(parts[1], parts[2]);
    return subject ? `${subject.title} · Unit ${parts[3]}` : null;
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
