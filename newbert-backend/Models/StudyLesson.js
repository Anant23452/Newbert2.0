const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  subjectId: { type: String, required: true },
  videoId: { type: String, required: true },
  unit: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, maxlength: 200 },
  summary: { type: String, default: '', maxlength: 4000 },
  minutes: { type: Number, default: 0 },
  mentorName: { type: String, default: '', maxlength: 100 },
  order: { type: Number, default: 0 },
  published: { type: Boolean, default: false },
  resources: { type: [{ title: String, url: String, kind: String }], default: [] },
  quiz: { type: [{ question: String, options: [String], correct: Number, explanation: String }], default: [] },
}, { timestamps: true });
schema.index({ subjectId: 1, videoId: 1 }, { unique: true });
module.exports = mongoose.model('StudyLesson', schema);
