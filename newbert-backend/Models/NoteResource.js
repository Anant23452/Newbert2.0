const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, maxlength: 120 },
  lectureUrl: { type: String, default: "", maxlength: 2000 },
  notesUrl: { type: String, default: "", maxlength: 2000 },
  questionsUrl: { type: String, default: "", maxlength: 2000 },
  syllabusUrl: { type: String, default: "", maxlength: 2000 },
  syllabusVersion: { type: String, default: "", maxlength: 100 },
  summary: { type: String, default: "", maxlength: 2000 },
  published: { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model("NoteResource", schema);
