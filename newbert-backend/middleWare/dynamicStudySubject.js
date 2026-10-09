const catalog = require('../data/academicCatalog.json');
const Subject = require('../Models/StudySubject');
const Lesson = require('../Models/StudyLesson');
// Existing curriculum remains unchanged; extend it only with published admin subjects.
module.exports = async function dynamicSubject(req,res,next) {
  try {
    const publishedIds = await Lesson.distinct('subjectId', {published:true});
    const subjects = await Subject.find({id:{$in:publishedIds}}).select('-_id -__v').lean();
    catalog.sources.newbert = {url:'https://www.newbert.in/study',edition:'Newbert',managed:true};
    for (const subject of subjects) {
      const index = catalog.subjects.findIndex(s=>s.id === subject.id);
      if(index < 0) catalog.subjects.push(subject); else catalog.subjects[index] = subject;
    }
    next();
  } catch(e) {next(e);}
};
