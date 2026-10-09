import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { studyCourses } from '../data/studyCatalog.js';
function fixture() {
  const catalog=JSON.parse(fs.readFileSync(new URL('../data/academicCatalog.json',import.meta.url),'utf8'));
  const source=fs.readFileSync(new URL('../data/academicStudy.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
  const context=vm.createContext({catalog,studyCourses:structuredClone(studyCourses),academicUnitKey:(b,s,u)=>`unit:${b}:${s}:${u}`,studyHref:key=>key});
  vm.runInContext(`${source}\nglobalThis.api={setManagedStudyContent,lessonsForUnit,subjectsFor,hasPublishedVideos,academicCatalog,studyCourses};`,context);
  return context.api;
}
test('student shelves only include subjects with published videos without deleting syllabus records',()=>{
  const a=fixture();
  const empty=a.academicCatalog.subjects.find(s=>!a.hasPublishedVideos(s));
  assert(empty);
  assert(!a.subjectsFor(empty.branches[0],empty.year,empty.semesters[0],empty.scheme).some(s=>s.id===empty.id));
  assert(a.academicCatalog.subjects.some(s=>s.id===empty.id));
});
test('publishing a new subject adds its lesson and preserves existing videos; refresh does not duplicate it',()=>{
  const a=fixture();
  const subject={id:'custom-subject',title:'Custom subject',code:'TEST',branches:['electrical'],year:3,semesters:[5],scheme:2022,source:'newbert',lectureCollection:'custom-subject',units:[1,2,3,4,5].map(number=>({number,title:`Unit ${number}`}))};
  const before=a.studyCourses[0].lessons[0].videoId;
  const payload={subjects:[subject],lessons:[{subjectId:subject.id,videoId:'abcdefghijk',title:'Lesson',unit:1,published:true}],overrides:[{subjectId:subject.id,videoId:'abcdefghijk'}]};
  a.setManagedStudyContent(payload);a.setManagedStudyContent(payload);
  assert(a.subjectsFor('electrical',3,5).some(s=>s.id===subject.id));
  assert.equal(a.lessonsForUnit(subject,1).length,1);
  assert.equal(a.studyCourses.find(c=>c.id===subject.id).lessons.length,1);
  assert.equal(a.studyCourses[0].lessons[0].videoId,before);
  a.setManagedStudyContent({subjects:[],lessons:[],overrides:payload.overrides});
  assert(!a.academicCatalog.subjects.some(s=>s.id===subject.id));
  assert(!a.studyCourses.some(c=>c.id===subject.id));
});
test('unpublishing a bundled lesson suppresses it for that subject while preserving other subject mappings',()=>{
  const a=fixture();
  const course=a.studyCourses.find(c=>a.academicCatalog.subjects.some(s=>s.lectureCollection===c.id));
  const subject=a.academicCatalog.subjects.find(s=>s.lectureCollection===course.id);
  const lesson=course.lessons.find(l=>l.unit>0);
  a.setManagedStudyContent({subjects:[],lessons:[],overrides:[{subjectId:subject.id,videoId:lesson.videoId}]});
  assert(!a.lessonsForUnit(subject,lesson.unit).some(l=>l.videoId===lesson.videoId));
  const other=a.academicCatalog.subjects.find(s=>s.id!==subject.id&&s.lectureCollection===course.id);
  if(other)assert(a.lessonsForUnit(other,lesson.unit).some(l=>l.videoId===lesson.videoId));
});
