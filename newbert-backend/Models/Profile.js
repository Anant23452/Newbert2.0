const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  score: { type: Number, min: 0, max: 100 },
  source: { type: String, enum: ["manual", "github", "leetcode", "linkedin", "ai"], default: "manual" },
}, { _id: false });

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  college: { type: String, trim: true, maxlength: 120 },
  branch: { type: String, trim: true, maxlength: 80 },
  graduationYear: { type: Number, min: 2020, max: 2040 },
  bio: { type: String, trim: true, maxlength: 600 },
  targetCompany: { type: String, trim: true, maxlength: 120 },
  githubUrl: { type: String, trim: true }, leetcodeUrl: { type: String, trim: true }, linkedinUrl: { type: String, trim: true },
  avatarUrl: { type: String, trim: true }, coverUrl: { type: String, trim: true },
  skills: { type: [skillSchema], default: [] },
  githubStats: { type: mongoose.Schema.Types.Mixed, default: null },
  leetcodeStats: { type: mongoose.Schema.Types.Mixed, default: null },
  activityCalendar: { type: [mongoose.Schema.Types.Mixed], default: [] },
  lastSyncedAt: Date,
  currentStreak: { type: Number, default: 0, min: 0 }, longestStreak: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Profile", profileSchema);
