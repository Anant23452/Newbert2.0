const ImprovementPlan = require("../Models/ImprovementPlan");
const SavedJob = require("../Models/SavedJob");
const StudyProgress = require("../Models/StudyProgress");
const { buildTodaySummary } = require("../services/todayService");
const { validateStudyUpdate, serializeStudyRecord, notebookKey } = require("../services/studyProgressService");

exports.getToday = async (req, res, next) => {
  try {
    const userId = req.auth.id;
    const [plans, savedJobs, studies] = await Promise.all([
      ImprovementPlan.find({ userId }).sort({ updatedAt: -1 }).lean(),
      SavedJob.find({ userId }).populate("jobId", "title company deadline application.deadline expiresAt active verification").lean(),
      StudyProgress.find({ userId, completed: false }).sort({ lastViewedAt: -1 }).limit(1).lean(),
    ]);
    res.json(buildTodaySummary({ plans, savedJobs, studies }));
  } catch (error) { next(error); }
};

exports.getStudyProgress = async (req, res, next) => {
  try {
    const records = await StudyProgress.find({ userId: req.auth.id }).select("key saved completed lastViewedAt positionSeconds durationSeconds confidence reviewAt -_id").lean();
    res.json({ records });
  } catch (error) { next(error); }
};

exports.updateStudyProgress = async (req, res, next) => {
  try {
    let validated;
    try { validated = validateStudyUpdate(req.body); } catch (error) { return res.status(400).json({ message: error.message }); }
    const { key, fields } = validated;
    const record = await StudyProgress.findOneAndUpdate({ userId: req.auth.id, key }, { $set: fields }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    res.json({ record: serializeStudyRecord(record) });
  } catch (error) { next(error); }
};

exports.getLectureProgress = async (req, res, next) => {
  try {
    const key = req.query.key;
    if (typeof key !== "string" || !notebookKey.test(key)) return res.status(400).json({ message: "Choose a valid lecture." });
    const record = await StudyProgress.findOne({ userId: req.auth.id, key }).lean();
    return res.json({ record: record ? serializeStudyRecord(record) : { key, notes: [], reflection: "", positionSeconds: 0, durationSeconds: 0, completed: false } });
  } catch (error) { next(error); }
};
