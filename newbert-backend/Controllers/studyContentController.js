const Lesson = require('../Models/StudyLesson');
const Subject = require('../Models/StudySubject');
const Doubt = require('../Models/StudyDoubt');
const User = require('../Models/User');
const { isStaff } = require('../middleWare/studyStaff');
const s = require('../services/studyContentService');
const { fetchVideo } = require('../services/youtubeMetadataService');
const handle = fn => async (req,res,next) => {try {await fn(req,res);} catch(e) { if(e.code === 11000) return res.status(409).json({message:'That subject or video already exists.'}); next(e);} };
const id = value => {if (!/^[a-f\d]{24}$/i.test(value || '')) s.invalid('Choose a valid record.'); return value;};
async function knownVideo(videoId) {
  if (!/^[\w-]{11}$/.test(videoId || '')) s.invalid('Choose a valid video.');
  if (await Lesson.exists({videoId,published:true})) return;
  if (!s.isLegacyVideo(videoId)) s.invalid('This lesson is not published.');
  // An admin can explicitly unpublish a previously bundled video.
  const overrides = await Lesson.find({videoId}).lean();
  const mappings = s.catalog.subjects.filter(sub=>s.baselineLesson(videoId,sub.id));
  if (mappings.length && mappings.every(sub=>overrides.some(l=>l.subjectId === sub.id && !l.published))) s.invalid('This lesson is not published.');
}
function doubtView(d, viewer, staff) {
  return {id:String(d._id),videoId:d.videoId,author:d.author,text:d.text,seconds:d.seconds,visibility:d.visibility,resolved:d.resolved,replies:d.replies,createdAt:d.createdAt,updatedAt:d.updatedAt,isMine:String(d.userId) === String(viewer),canReply:staff};
}
exports.catalog = handle(async(req,res)=>{
  const lessons = await Lesson.find().select('-__v').lean();
  const subjects = await Subject.find({id:{$in:lessons.filter(l=>l.published).map(l=>l.subjectId)}}).select('-__v -_id').lean();
  res.json({subjects,lessons:lessons.filter(l=>l.published).map(s.publicLesson),overrides:lessons.map(l=>({subjectId:l.subjectId,videoId:l.videoId}))});
});
exports.adminList = handle(async(req,res)=>res.json({subjects:await Subject.find().lean(),lessons:await Lesson.find().sort({order:1}).lean()}));
exports.subject = handle(async(req,res)=>res.status(201).json({subject:await Subject.create(s.validateSubject(req.body))}));
exports.importVideo = handle(async(req,res)=>res.json({video:await fetchVideo(req.body.url)}));
const draftRequests = new Map();
exports.generateDraft = handle(async(req,res)=>{
  const key = String(req.auth.id), now = Date.now();
  for(const [id,at] of draftRequests) if(now-at>60000) draftRequests.delete(id);
  if(draftRequests.has(key)) return res.status(429).json({message:'Wait a minute before generating another draft.'});
  draftRequests.set(key,now);
  const { createDraft } = require('../services/studyDraftService');
  res.set('Cache-Control','no-store').json({draft:await createDraft(req.body || {})});
});
exports.saveLesson = handle(async(req,res)=>{
  const values = s.validateLesson(req.body);
  if (!s.catalog.subjects.some(sub=>sub.id === values.subjectId) && !await Subject.exists({id:values.subjectId})) s.invalid('Choose an existing subject.');
  const existing = await Lesson.findOne({subjectId:values.subjectId,videoId:values.videoId});
  if ((existing || s.baselineLesson(values.videoId, values.subjectId)) && !req.body.edit) return res.status(409).json({message:'This video is already added to the subject. Select Edit instead.'});
  if (values.published) await fetchVideo(req.body.url); // Verify availability before publishing, never trust a client preview.
  const lesson = await Lesson.findOneAndUpdate({subjectId:values.subjectId,videoId:values.videoId},{$set:values},{upsert:true,new:true,runValidators:true});
  res.json({lesson});
});
exports.questions = handle(async(req,res)=>{
  await knownVideo(req.params.videoId);
  const staff = await isStaff(req.auth?.id);
  const clauses = [{visibility:'public'}];
  if(req.auth?.id) clauses.push({userId:req.auth.id});
  const query = {videoId:req.params.videoId,...(!staff && {$or:clauses})};
  const doubts = await Doubt.find(query).sort({createdAt:-1}).limit(100).lean();
  res.set('Cache-Control','no-store').json({doubts:doubts.map(d=>doubtView(d,req.auth?.id,staff))});
});
exports.ask = handle(async(req,res)=>{
  await knownVideo(req.params.videoId);
  const {visibility,seconds} = req.body;
  if(!['public','private'].includes(visibility) || !Number.isInteger(seconds) || seconds < 0 || seconds > 86400) s.invalid('Choose question visibility and a valid timestamp.');
  if(await Doubt.countDocuments({userId:req.auth.id,createdAt:{$gte:new Date(Date.now()-60000)}}) >= 3) return res.status(429).json({message:'Please wait before asking another question.'});
  const user = await User.findById(req.auth.id).select('name').lean();
  const doubt = await Doubt.create({videoId:req.params.videoId,userId:req.auth.id,author:String(user?.name || 'Student').slice(0,100),text:s.text(req.body.text,2000,true),seconds,visibility});
  res.status(201).json({doubt:doubtView(doubt,req.auth.id,false)});
});
exports.resolve = handle(async(req,res)=>{
  if(typeof req.body.resolved !== 'boolean') s.invalid('Choose a valid question status.');
  const doubt = await Doubt.findOneAndUpdate({_id:id(req.params.id),userId:req.auth.id},{$set:{resolved:req.body.resolved}},{new:true});
  if(!doubt) return res.status(404).json({message:'Your question was not found.'});
  res.json({doubt:doubtView(doubt,req.auth.id,false)});
});
exports.reply = handle(async(req,res)=>{
  const user = await User.findById(req.auth.id).select('name').lean();
  const doubt = await Doubt.findOneAndUpdate({_id:id(req.params.id),'replies.49':{$exists:false}},{$push:{replies:{author:String(user?.name || 'Mentor').slice(0,100),text:s.text(req.body.text,4000,true),createdAt:new Date()}},$set:{resolved:false}},{new:true,runValidators:true});
  if(!doubt) return res.status(404).json({message:'Question not found or reply limit reached.'});
  res.json({doubt:doubtView(doubt,req.auth.id,true)});
});
exports.inbox = handle(async(req,res)=>{
  const query = req.query.status === 'unanswered' ? {'replies.0':{$exists:false}} : {};
  const doubts = await Doubt.find(query).sort({updatedAt:-1}).limit(100).lean();
  res.set('Cache-Control','no-store').json({doubts:doubts.map(d=>doubtView(d,req.auth.id,true))});
});
exports.mine = handle(async(req,res)=>{
  const doubts = await Doubt.find({userId:req.auth.id}).sort({updatedAt:-1}).limit(100).lean();
  res.set('Cache-Control','no-store').json({doubts:doubts.map(d=>doubtView(d,req.auth.id,false))});
});
exports.grade = handle(async(req,res)=>{
  const lesson = await Lesson.findOne({_id:id(req.params.id),published:true}).lean();
  if(!lesson) return res.status(404).json({message:'Published quiz not found.'});
  const answers = req.body.answers;
  if(!Array.isArray(answers) || !lesson.quiz.length || answers.length !== lesson.quiz.length || answers.some(a=>!Number.isInteger(a)||a<0||a>3)) s.invalid('Answer each quiz question.');
  const results = lesson.quiz.map((q,i)=>({correct:q.correct,explanation:q.explanation,passed:answers[i] === q.correct}));
  res.json({score:results.filter(r=>r.passed).length,total:results.length,results});
});
exports.practiceSolution = handle(async(req,res)=>{
  s.text(req.body.answer,6000,true);
  const lesson = await Lesson.findOne({_id:id(req.params.id),published:true}).lean();
  const question = lesson?.practice?.find(q=>String(q._id)===id(req.params.questionId));
  if(!question) return res.status(404).json({message:'Published practice question not found.'});
  res.json({solution:question.solution,message:'Compare your steps with the model answer. Written answers are self-reviewed, not automatically graded.'});
});
