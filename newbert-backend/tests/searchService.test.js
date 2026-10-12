const test=require('node:test');
const assert=require('node:assert/strict');
const {searchPattern}=require('../services/searchService');
test('search accepts bounded literal names and rejects short or non-string input',()=>{
  assert.equal(searchPattern({}),null);assert.equal(searchPattern(' a '),null);
  assert.ok(searchPattern(' Anant ').test('ANANT kumar'));
  assert.ok(searchPattern('C++').test('C++'));assert.equal(searchPattern('.*').test('Anant'),false);
  assert.equal(searchPattern('a'.repeat(100)).source.length,80);
});
test('guest lesson metadata excludes note links and paper URLs',()=>{
 const {publicLesson}=require('../services/studyContentService');
 const lesson={resources:[{url:'https://example.com/notes.pdf'}],practice:[{_id:'q1',sourceUrl:'https://example.com/paper.pdf'}]};
 assert.deepEqual(publicLesson(lesson,false).resources,[]);
 assert.equal(publicLesson(lesson,false).practice[0].sourceUrl,undefined);
 assert.equal(publicLesson(lesson,true).resources[0].url,lesson.resources[0].url);
});
test('search returns only public identity fields and excludes draft lectures',async()=>{
 const Profile=require('../Models/Profile'), Alumni=require('../Models/Alumni'), Subject=require('../Models/StudySubject'), Lesson=require('../Models/StudyLesson');
 const originals=[Profile.aggregate,Alumni.find,Subject.find,Lesson.find];
 const chain=value=>({select(){return this;},limit(){return this;},maxTimeMS(){return this;},lean:async()=>value});
 try {
  Profile.aggregate=()=>({option:async()=>[
   {userId:'public-user',person:{name:'Anant',email:'never-return@example.com'},collegeName:'Example College',privacy:{profileVisibility:'public'}},
   {userId:'private-user',person:{name:'Private'},privacy:{profileVisibility:'private'}}
  ]});
  Alumni.find=()=>chain([]);Subject.find=()=>chain([]);
  Lesson.find=()=>chain([{subjectId:'ee3-bee501',videoId:'PrwsICCz3EQ',unit:2,title:'Anant draft',published:false}]);
  const router=require('../routes/searchRoutes');let response;
  await router.stack.find(l=>l.route).route.stack[0].handle({query:{q:'Anant'}},{json:value=>{response=value;}},error=>{throw error;});
  assert.deepEqual(response.results,[{type:'Student',title:'Anant',detail:'Example College',url:'/profile/public-user'}]);
  assert.equal(JSON.stringify(response).includes('never-return'),false);
 }finally{[Profile.aggregate,Alumni.find,Subject.find,Lesson.find]=originals;}
});
