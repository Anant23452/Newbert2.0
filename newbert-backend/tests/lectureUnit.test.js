const {test}=require('node:test');
const assert=require('node:assert/strict');
const {lectureUnit}=require('../services/lectureUnit');
const {validateLesson}=require('../services/studyContentService');
test('detects explicit units without confusing subject, year or part numbers',()=>{
  assert.equal(lectureUnit('Power System 1 || Unit 2 || Part 1 || 3rd Yr'),2);
  assert.equal(lectureUnit('UNIT-5 Part 2'),5);
  assert.equal(lectureUnit('Unit 1 and Unit 2'),null);
  assert.equal(lectureUnit('Chapter 2 Part 1'),null);
  assert.equal(lectureUnit('Unit 12'),null);
});
test('conflicting unit needs explicit confirmation; correct assignment is accepted',()=>{
  const body={url:'https://youtu.be/abcdefghijk',subjectId:'test',unit:1,title:'Power System 1 Unit 2',published:true};
  assert.throws(()=>validateLesson(body),/title says Unit 2/);
  assert.equal(validateLesson({...body,unit:2}).unit,2);
  assert.equal(validateLesson({...body,unitConfirmed:true}).unit,1);
});
