const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  score: { type: Number, min: 0, max: 100 },
  source: { type: String, enum: ["manual", "github", "leetcode", "linkedin", "ai"], default: "manual" },
}, { _id: false });

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  college: { type: String, trim: true, maxlength: 120 },
  collegeId: { type: String, trim: true, lowercase: true, index: true, default: null },
  collegeName: { type: String, trim: true, maxlength: 160, default: null },
  branch: { type: String, trim: true, maxlength: 80 },
  graduationYear: { type: Number, min: 2020, max: 2040 },
  bio: { type: String, trim: true, maxlength: 600 },
  targetRole: { type: String, trim: true, maxlength: 120, default: null },
  targetCompany: { type: String, trim: true, maxlength: 120 },
  githubUrl: { type: String, trim: true, default: null }, githubUsername: { type: String, trim: true, default: null },
  leetcodeUrl: { type: String, trim: true, default: null }, leetcodeUsername: { type: String, trim: true, default: null },
  linkedinUrl: { type: String, trim: true, default: null },
  avatarUrl: { type: String, trim: true }, coverUrl: { type: String, trim: true },
  projects: { type: Number, min: 0 }, cgpa: { type: Number, min: 0, max: 10 },
  skills: { type: [skillSchema], default: [] },
  githubStats: { type: mongoose.Schema.Types.Mixed, default: null },
  leetcodeStats: { type: mongoose.Schema.Types.Mixed, default: null },
  activityCalendar: { type: [mongoose.Schema.Types.Mixed], default: [] },
  syncErrors: { type: mongoose.Schema.Types.Mixed, default: null },
  lastSyncedAt: Date,
  currentStreak: { type: Number, default: 0, min: 0 }, longestStreak: { type: Number, default: 0, min: 0 },
  onboardingCompleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Profile", profileSchema);
