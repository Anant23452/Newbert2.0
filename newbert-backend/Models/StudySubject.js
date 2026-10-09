const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true, maxlength: 200 },
  code: { type: String, required: true, maxlength: 40 },
  branches: [String], year: Number, semesters: [Number], scheme: Number,
  kind: { type: String, default: 'core' },
  units: [{ number: Number, title: String }],
  source: String, lectureCollection: String,
}, { timestamps: true });
module.exports = mongoose.model('StudySubject', schema);
