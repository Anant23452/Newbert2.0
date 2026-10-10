const test = require('node:test');
const assert = require('node:assert/strict');
const {createDraft,parseDraft} = require('../services/studyDraftService');
const quiz = [{question:'What is 2+2?',options:['1','2','3','4'],correct:3,explanation:'Adding two and two gives four.'}];
const raw = JSON.stringify({summary:'Addition',quiz,practice:[{type:'short',question:'Define addition.',solution:'Combining quantities.',marks:0,isPYQ:true,exam:'Invented',year:2020,sourceUrl:'https://fake.example',_id:'123456789012345678901234'}],warnings:[]});
test('draft validates questions and strips invented provenance and IDs',()=>{
  const draft=parseDraft(raw);
  assert.equal(draft.quiz[0].correct,3);
  assert.equal(draft.practice[0].isPYQ,false);
  assert.equal(draft.practice[0].exam,'');
  assert.equal(draft.practice[0]._id,undefined);
});
test('sourced PYQs retain supplied provenance and MCQ options',()=>{
  const draft=parseDraft(raw,{exam:'AKTU',year:2024,sourceUrl:'https://example.com/paper.pdf'});
  assert.equal(draft.quiz.length,0);
  assert.equal(draft.practice.length,2);
  assert.match(draft.practice[1].question,/D\. 4/);
  assert.equal(draft.practice[1].exam,'AKTU');
});
test('malformed, over-limit and invalid answers are rejected',()=>{
  assert.throws(()=>parseDraft('not JSON'));
  assert.throws(()=>parseDraft(JSON.stringify({summary:'',quiz:[{...quiz[0],correct:9}],practice:[],warnings:[]})));
  assert.throws(()=>parseDraft(JSON.stringify({summary:'',quiz:Array(11).fill(quiz[0]),practice:[],warnings:[]})));
});
test('invalid video or PYQ source is rejected before provider call',async()=>{
  const generate=()=>{throw Error('should not call provider');};
  await assert.rejects(createDraft({mode:'video',url:'https://evil.example/video'},generate),/YouTube/);
  await assert.rejects(createDraft({mode:'text',text:'Question',isPYQ:true,exam:'AKTU',year:2024,sourceUrl:'http://example.com'},generate),/HTTPS/);
});
test('video passes canonical URL and pasted text is not a video request',async()=>{
  let request;
  const generate=async r=>{request=r;return raw;};
  await createDraft({mode:'video',url:'https://youtu.be/abcdefghijk'},generate);
  assert.equal(request.videoUrl,'https://www.youtube.com/watch?v=abcdefghijk');
  await createDraft({mode:'text',text:'Questions'},generate);
  assert.equal(request.videoUrl,undefined);
});
