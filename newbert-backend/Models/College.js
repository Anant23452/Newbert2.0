const mongoose = require("mongoose");
const collegeSchema = new mongoose.Schema({
  collegeId: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 180 },
  shortName: { type: String, trim: true, maxlength: 100, index: true },
  abbreviation: { type: String, trim: true, uppercase: true, maxlength: 30, index: true },
  normalizedName: { type: String, required: true, trim: true, maxlength: 180, index: true },
  city: { type: String, trim: true, maxlength: 100 }, district: { type: String, trim: true, maxlength: 100 },
  state: { type: String, trim: true, maxlength: 100, index: true }, stateCode: { type: String, trim: true, uppercase: true, maxlength: 8 },
  country: { type: String, trim: true, maxlength: 80, default: "India" }, university: { type: String, trim: true, maxlength: 180 },
  collegeType: { type: String, trim: true, maxlength: 100 }, courses: { type: [String], default: [] }, aliases: { type: [String], default: [] },
  isActive: { type: Boolean, default: true, index: true }, active: { type: Boolean, default: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({ source: "manual", verified: false }) },
}, { timestamps: true });
collegeSchema.index({ isActive: 1, normalizedName: 1 });
collegeSchema.index({ name: "text", shortName: "text", aliases: "text" });
collegeSchema.pre("validate", function normalizeIdentity(next) { this.normalizedName = String(this.name || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " "); if (this.isActive == null) this.isActive = this.active !== false; if (this.active == null) this.active = this.isActive !== false; next(); });
module.exports = mongoose.model("College", collegeSchema);
