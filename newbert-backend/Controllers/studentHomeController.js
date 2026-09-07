const ImprovementPlan = require("../Models/ImprovementPlan");
const SavedJob = require("../Models/SavedJob");
const StudyProgress = require("../Models/StudyProgress");
const { buildTodaySummary } = require("../services/todayService");

exports.getToday = async (req, res, next) => {
  try {
    const userId = req.auth.id;
    const [plans, savedJobs, studies] = await Promise.all([
      ImprovementPlan.find({ userId }).sort({ updatedAt: -1 }).lean(),
      SavedJob.find({ userId }).populate("jobId", "title company deadline active verification").lean(),
      StudyProgress.find({ userId, completed: false }).sort({ lastViewedAt: -1 }).limit(1).lean(),
    ]);
    res.json(buildTodaySummary({ plans, savedJobs, studies }));
  } catch (error) { next(error); }
};

exports.getStudyProgress = async (req, res, next) => {
  try {
    const records = await StudyProgress.find({ userId: req.auth.id }).select("key saved completed lastViewedAt -_id").lean();
    res.json({ records });
  } catch (error) { next(error); }
};

exports.updateStudyProgress = async (req, res, next) => {
  try {
    const { key, completed, saved } = req.body;
    if (typeof key !== "string" || !/^(electrical|civil|information-technology):sem[1-8]:[a-z0-9-]{1,60}:[1-5]$/.test(key)) return res.status(400).json({ message: "Choose a valid study unit." });
    if ((completed !== undefined && typeof completed !== "boolean") || (saved !== undefined && typeof saved !== "boolean")) return res.status(400).json({ message: "Progress values must be true or false." });
    const updates = { lastViewedAt: new Date(), ...(completed !== undefined && { completed }), ...(saved !== undefined && { saved }) };
    const record = await StudyProgress.findOneAndUpdate({ userId: req.auth.id, key }, { $set: updates }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    res.json({ record: { key: record.key, completed: record.completed, saved: record.saved, lastViewedAt: record.lastViewedAt } });
  } catch (error) { next(error); }
};
