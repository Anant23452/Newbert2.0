const mongoose = require("mongoose");
const courseReviewSchema = new mongoose.Schema({ courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, rating: { type: Number, required: true, min: 1, max: 5 }, review: { type: String, required: true, trim: true, maxlength: 2000 }, goalUsedFor: { type: String, trim: true, maxlength: 160 }, usefulness: { type: mongoose.Schema.Types.Mixed, default: null }, outcomeAtTimeOfReview: { type: mongoose.Schema.Types.Mixed, default: null }, reviewerType: { type: String, enum: ["student", "senior"], default: "student" }, verifiedReviewer: { type: Boolean, default: false }, hidden: { type: Boolean, default: false },
}, { timestamps: true });
courseReviewSchema.index({ courseId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model("CourseReview", courseReviewSchema);
