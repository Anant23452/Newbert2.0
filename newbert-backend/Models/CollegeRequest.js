const mongoose = require("mongoose");
const collegeRequestSchema = new mongoose.Schema({ requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, normalizedName: { type: String, required: true, select: false }, name: { type: String, required: true, trim: true, maxlength: 180 }, university: { type: String, trim: true, maxlength: 120 }, city: { type: String, trim: true, maxlength: 100 }, state: { type: String, trim: true, maxlength: 100 }, course: { type: String, enum: ["B.Tech", "M.Tech", "BCA", "MCA", "Other"], default: "B.Tech" }, website: { type: String, trim: true, default: null }, status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, reviewedAt: { type: Date, default: null }, approvedCollegeId: { type: String, default: null } }, { timestamps: true });
collegeRequestSchema.index(
  { requestedBy: 1, normalizedName: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);
module.exports = mongoose.model("CollegeRequest", collegeRequestSchema);
