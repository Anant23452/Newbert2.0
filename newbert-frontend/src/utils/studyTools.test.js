import test from 'node:test';
import assert from 'node:assert/strict';
import { youtubeId,timeLabel,isReviewDue,nextReview,mergeStudySummaries } from './studyTools.js';
import { studyCourses,lectureKey,studyHref } from '../data/studyCatalog.js';
import { studyGuides } from '../data/studyGuides.js';
test('catalogue contains 45 unique observed lectures across 12 subjects with companions',()=>{
 assert.equal(studyCourses.length,12); const lessons=studyCourses.flatMap(c=>c.lessons);
 assert.equal(lessons.length,45);assert.equal(new Set(lessons.map(l=>l.videoId)).size,45);
 for(const course of studyCourses){assert.ok(studyGuides[course.id]?.question);for(const lesson of course.lessons){assert.equal(youtubeId(lesson.url),lesson.videoId);assert.ok(lesson.minutes>0);}}
});
test('YouTube URL parsing rejects unrelated hosts and invalid identifiers',()=>{
 assert.equal(youtubeId('https://youtu.be/CbtTp6n_Q7A?t=4'),'CbtTp6n_Q7A');
 assert.equal(youtubeId('https://youtube.com.evil.test/watch?v=CbtTp6n_Q7A'),null);
 assert.equal(youtubeId('javascript:alert(1)'),null);assert.equal(youtubeId('https://youtube.com/watch?v=bad'),null);
});
test('resume links preserve both lecture and legacy unit routes',()=>{
 assert.equal(studyHref(lectureKey('dbms','CbtTp6n_Q7A')),'/study/dbms?lesson=CbtTp6n_Q7A');
 assert.equal(studyHref('unit:information-technology:it4-bcs071:2'),'/study/branch/information-technology/subject/it4-bcs071?unit=2');
 assert.match(studyHref('electrical:sem1:bee:1'),/^\/notes\/electrical\?unit=/);
});
test('review scheduling and display handle long lectures',()=>{
 assert.equal(timeLabel(3661),'1:01:01'); const now=Date.parse('2026-09-11T00:00:00Z');
 assert.equal(nextReview('good',now),'2026-09-14T00:00:00.000Z'); assert.equal(isReviewDue({reviewAt:nextReview('good',now)},now),false);assert.equal(isReviewDue({reviewAt:nextReview('again',now)},now),true);
});
test('newer account progress is not shadowed by an old local index',()=>{
 const remote={key:'a',completed:true,lastViewedAt:'2026-09-11'};const local={key:'a',completed:false,lastViewedAt:'2026-09-10'};
 assert.equal(mergeStudySummaries([remote],[local])[0].completed,true);
 assert.equal(mergeStudySummaries([local],[remote])[0].completed,true);
});
