const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  videoId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  author: { type: String, default: 'Student', maxlength: 100 },
  text: { type: String, required: true, maxlength: 2000 },
  seconds: { type: Number, default: 0 },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  resolved: { type: Boolean, default: false },
  replies: { type: [{ author: String, text: String, createdAt: Date }], default: [] },
}, { timestamps: true });
module.exports = mongoose.model('StudyDoubt', schema);
