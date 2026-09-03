const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  score: { type: Number, min: 0, max: 100 },
  source: { type: String, enum: ["manual", "github", "leetcode", "linkedin", "ai"], default: "manual" },
}, { _id: false });

const privacySectionsSchema = new mongoose.Schema({
  about: { type: Boolean, default: true },
  skills: { type: Boolean, default: true },
  projects: { type: Boolean, default: true },
  github: { type: Boolean, default: true },
  leetcode: { type: Boolean, default: true },
  linkedin: { type: Boolean, default: false },
  achievements: { type: Boolean, default: true },
  education: { type: Boolean, default: true },
  careerGoal: { type: Boolean, default: true },
  courses: { type: Boolean, default: true },
  activityHeatmap: { type: Boolean, default: true },
  streakStats: { type: Boolean, default: true },
  leaderboardRank: { type: Boolean, default: true },
}, { _id: false });

const privacySchema = new mongoose.Schema({
  profileVisibility: { type: String, enum: ["public", "private"], default: "public" },
  sections: { type: privacySectionsSchema, default: () => ({}) },
}, { _id: false });

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  college: { type: String, trim: true, maxlength: 120 },
  collegeRef: { type: mongoose.Schema.Types.ObjectId, ref: "College", index: true, default: null },
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
  projectDetails: { type: [mongoose.Schema.Types.Mixed], default: [] },
  skills: { type: [skillSchema], default: [] },
  githubStats: { type: mongoose.Schema.Types.Mixed, default: null },
  leetcodeStats: { type: mongoose.Schema.Types.Mixed, default: null },
  activityCalendar: { type: [mongoose.Schema.Types.Mixed], default: [] },
  syncErrors: { type: mongoose.Schema.Types.Mixed, default: null },
  evidenceCache: { type: mongoose.Schema.Types.Mixed, default: () => ({ github: null, leetcode: null, readiness: null }) },
  lastSyncedAt: Date,
  currentStreak: { type: Number, default: 0, min: 0 }, longestStreak: { type: Number, default: 0, min: 0 },
  privacy: { type: privacySchema, default: () => ({}) },
  onboardingCompleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Profile", profileSchema);
