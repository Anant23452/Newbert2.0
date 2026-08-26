const mongoose = require("mongoose");
const collegeSchema = new mongoose.Schema({ collegeId: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true }, name: { type: String, required: true, trim: true, maxlength: 180 }, shortName: { type: String, trim: true, maxlength: 100 }, university: { type: String, trim: true, maxlength: 120 }, city: { type: String, trim: true, maxlength: 100 }, state: { type: String, trim: true, maxlength: 100 }, courses: { type: [String], default: [] }, aliases: { type: [String], default: [] }, active: { type: Boolean, default: true } }, { timestamps: true });
collegeSchema.index({ active: 1, name: 1 });
module.exports = mongoose.model("College", collegeSchema);
