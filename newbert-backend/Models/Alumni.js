const mongoose = require("mongoose");

const phaseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  order: { type: Number, min: 1 },
  duration: { type: String, trim: true, maxlength: 80 },
  focus: { type: [String], default: [] },
  description: { type: String, trim: true, maxlength: 1000 },
}, { _id: false });

const courseSchema = new mongoose.Schema({
  courseName: { type: String, required: true, trim: true, maxlength: 160 },
  provider: { type: String, trim: true, maxlength: 120 },
  category: { type: String, trim: true, maxlength: 80 },
  path: { type: String, enum: ["placement", "gate"], required: true },
  subjectOrSkill: { type: String, trim: true, maxlength: 120 },
  completed: Boolean,
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String, trim: true, maxlength: 1200 },
  usefulness: { type: String, enum: ["high", "medium", "low"] },
  wouldRecommend: Boolean,
  helpedWith: { type: [String], default: [] },
}, { _id: false });

const placementOutcomeSchema = new mongoose.Schema({
  company: { type: String, trim: true, maxlength: 120 }, role: { type: String, trim: true, maxlength: 120 },
  packageLpa: { type: Number, min: 0 }, offerType: { type: String, trim: true, maxlength: 80 },
  placementYear: { type: Number, min: 2000, max: 2050 }, location: { type: String, trim: true, maxlength: 120 },
}, { _id: false });

const placementPreparationSchema = new mongoose.Schema({
  preparationMonths: { type: Number, min: 0 }, averageHoursPerDay: { type: Number, min: 0, max: 24 },
  dsa: { type: mongoose.Schema.Types.Mixed, default: null }, development: { type: mongoose.Schema.Types.Mixed, default: null },
  csFundamentals: { type: mongoose.Schema.Types.Mixed, default: null }, interviewPreparation: { type: mongoose.Schema.Types.Mixed, default: null },
  internships: { type: [mongoose.Schema.Types.Mixed], default: [] }, contests: { type: [mongoose.Schema.Types.Mixed], default: [] },
  preparationPhases: { type: [phaseSchema], default: [] },
}, { _id: false });

const gateOutcomeSchema = new mongoose.Schema({
  examYear: { type: Number, min: 2000, max: 2050 }, paper: { type: String, trim: true, maxlength: 40 },
  score: { type: Number, min: 0 }, marks: { type: Number, min: 0 }, air: { type: Number, min: 1 },
  qualified: Boolean, percentile: { type: Number, min: 0, max: 100 },
  outcomeType: { type: String, enum: ["iit", "nit", "iiit", "psu", "qualified", "other"] },
  institute: { type: String, trim: true, maxlength: 160 }, program: { type: String, trim: true, maxlength: 120 },
  psu: { type: String, trim: true, maxlength: 120 }, psuRole: { type: String, trim: true, maxlength: 120 },
}, { _id: false });

const gateSubjectSchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true, maxlength: 100 },
  strength: { type: String, enum: ["strong", "medium", "weak"] }, completed: Boolean,
  revisionCount: { type: Number, min: 0 }, notesSource: { type: String, trim: true, maxlength: 200 },
  questionPracticeCount: { type: Number, min: 0 },
}, { _id: false });

const testSeriesSchema = new mongoose.Schema({
  provider: { type: String, trim: true, maxlength: 120 }, testCountAttempted: { type: Number, min: 0 },
  averageScore: { type: Number, min: 0 }, bestScore: { type: Number, min: 0 }, review: { type: String, trim: true, maxlength: 1000 },
}, { _id: false });

const gatePreparationSchema = new mongoose.Schema({
  preparationMonths: { type: Number, min: 0 }, averageHoursPerDay: { type: Number, min: 0, max: 24 },
  subjects: { type: [gateSubjectSchema], default: [] }, strongSubjects: { type: [String], default: [] }, weakSubjects: { type: [String], default: [] },
  testSeries: { type: [testSeriesSchema], default: [] }, mockTests: { type: mongoose.Schema.Types.Mixed, default: null },
  previousYearQuestions: { type: mongoose.Schema.Types.Mixed, default: null }, revisionStrategy: { type: mongoose.Schema.Types.Mixed, default: null },
  preparationPhases: { type: [phaseSchema], default: [] },
}, { _id: false });

const alumniSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  college: { type: String, required: true, trim: true, maxlength: 120 },
  collegeRef: { type: mongoose.Schema.Types.ObjectId, ref: "College", index: true, default: null },
  collegeId: { type: String, trim: true, lowercase: true, index: true, default: null },
  collegeName: { type: String, trim: true, maxlength: 180, default: null },
  batch: { type: Number, required: true, min: 2000, max: 2050 },
  company: { type: String, trim: true, maxlength: 120 },
  role: { type: String, trim: true, maxlength: 120 },
  careerPaths: { type: [{ type: String, enum: ["placement", "gate"] }], default: [] },
  outcomeType: { type: String, enum: ["placement", "gate", "core", "data", "psu", "internship"], default: "placement" },
  path: { type: String, enum: ["placement", "gate", "core", "data", "psu", "internship"], default: "placement" },
  branch: { type: String, trim: true, maxlength: 80 },
  graduationYear: { type: Number, min: 2000, max: 2050 },
  package: { type: Number, min: 0 },
  gateAIR: { type: Number, min: 1 },
  skills: { type: [String], default: [] },
  dsaSolved: { type: Number, min: 0 },
  projects: { type: Number, min: 0 },
  githubPublicRepos: { type: Number, min: 0 },
  cgpa: { type: Number, min: 0, max: 10 },
  avatarUrl: { type: String, trim: true },
  bio: { type: String, trim: true, maxlength: 1200 },
  academics: { type: mongoose.Schema.Types.Mixed, default: null },
  achievements: { type: [mongoose.Schema.Types.Mixed], default: [] },
  journey: { type: String, trim: true, maxlength: 5000 },
  preparationMonths: { type: Number, min: 0 },
  internships: { type: [mongoose.Schema.Types.Mixed], default: [] },
  projectsDetail: { type: [mongoose.Schema.Types.Mixed], default: [] },
  advice: { type: String, trim: true, maxlength: 3000 },
  interviewExperience: { type: [mongoose.Schema.Types.Mixed], default: [] },
  placement: { type: mongoose.Schema.Types.Mixed, default: null },
  dsa: { type: mongoose.Schema.Types.Mixed, default: null },
  github: { type: mongoose.Schema.Types.Mixed, default: null },
  csFundamentals: { type: [String], default: [] },
  gate: { type: mongoose.Schema.Types.Mixed, default: null },
  core: { type: mongoose.Schema.Types.Mixed, default: null },
  placementOutcome: { type: placementOutcomeSchema, default: null },
  placementPreparation: { type: placementPreparationSchema, default: null },
  gateOutcome: { type: gateOutcomeSchema, default: null },
  gatePreparation: { type: gatePreparationSchema, default: null },
  courses: { type: [courseSchema], default: [] },
  adviceDetails: { type: mongoose.Schema.Types.Mixed, default: null },
  mentorshipEnabled: { type: Boolean, default: false },
  availableTopics: { type: [String], default: [] },
  privacy: { type: mongoose.Schema.Types.Mixed, default: () => ({ profile: true, academics: true, preparation: true, courses: true, advice: true, mentorship: true }) },
  isDummyData: { type: Boolean, default: false, index: true },
  dummyKey: { type: String, trim: true, sparse: true },
  verified: { type: Boolean, default: false },
}, { timestamps: true });

alumniSchema.index({ college: 1, verified: 1, createdAt: -1 });
alumniSchema.index({ collegeRef: 1, verified: 1, createdAt: -1 });
alumniSchema.index({ careerPaths: 1, verified: 1 });
module.exports = mongoose.model("Alumni", alumniSchema);
