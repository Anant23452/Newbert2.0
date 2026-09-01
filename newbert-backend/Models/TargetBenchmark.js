const mongoose = require("mongoose");

const targetBenchmarkSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  company: { type: String, trim: true, default: null },
  role: { type: String, required: true, trim: true },
  normalizedRole: { type: String, required: true, trim: true },
  targetType: { type: String, trim: true, default: "role_only" },
  companyCategory: { type: String, trim: true, default: null },
  region: { type: String, trim: true, default: null },
  categories: { type: [mongoose.Schema.Types.Mixed], default: [] },
  requirements: { type: [mongoose.Schema.Types.Mixed], default: [] },
  evidenceSummary: { type: mongoose.Schema.Types.Mixed, default: null },
  confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
  sourceLayer: { type: String, required: true },
  fallbackMessage: { type: String, default: null },
  sourceVersion: { type: String, default: "target-benchmark-v1" },
  lastRefreshedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model("TargetBenchmark", targetBenchmarkSchema);
