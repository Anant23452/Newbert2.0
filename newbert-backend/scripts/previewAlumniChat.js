// Optional isolated development server: no MongoDB, provider calls or real user accounts.
if(process.env.NODE_ENV==='production')throw new Error('The alumni preview is development-only.');
const {setup}=require('../tests/helpers/alumniChatHarness');
const {initialSession}=require('../services/alumniChatService');
const engine=require('../services/alumniQuestionEngine');
const h=setup();
if(process.argv.includes('--seed')){
 const s=initialSession({_id:h.userId,name:'Rahul Verma (demo)'},null,null);
 for(const [id,value]of Object.entries(require('../tests/fixtures/alumniChatDemo')))engine.answer(s,id,value);
 s.prefill={};s.__v=0;s._id='development-session';h.sessions.set(h.userId,s);
}
h.app.get('/api/development-session',(req,res)=>res.json({token:h.token(),user:{id:h.userId,name:'QA Senior'},profile:{userId:h.userId,name:'QA Senior',onboardingCompleted:true}}));
h.app.listen(5191,'127.0.0.1',()=>console.log('Isolated alumni API preview: http://127.0.0.1:5191 (in-memory; no real database).'));
