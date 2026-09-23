const mongoose = require('mongoose');

const mixed = () => ({ type: mongoose.Schema.Types.Mixed, default: () => ({}) });

// Guest sessions use a separate collection: the existing account-session userId
// unique index must remain intact for signed-in alumni.
const schema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, select: false },
  answers: mixed(), rawAnswers: mixed(), extractedAnswers: mixed(), inactiveAnswers: mixed(),
  prefill: mixed(), pendingExtraction: { type: mongoose.Schema.Types.Mixed, default: null },
  history: { type: [mongoose.Schema.Types.Mixed], default: [] },
  skippedQuestions: { type: [String], default: [] },
  completedSections: { type: [String], default: [] },
  currentQuestionId: { type: String, default: 'name' },
  currentSection: { type: String, default: 'Basics' },
  progress: { type: Number, default: 0 },
  status: { type: String, enum: ['IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ABANDONED'], default: 'IN_PROGRESS' },
  startedAt: { type: Date, default: Date.now }, lastActivityAt: { type: Date, default: Date.now },
  completedAt: Date, publishedAlumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alumni' },
  publishLockUntil: Date,
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model('AlumniGuestSession', schema);
