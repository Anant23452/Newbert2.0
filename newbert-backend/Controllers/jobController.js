const Job = require("../Models/Job");

exports.listJobs = async (req, res, next) => {
  try {
    const query = { active: true };
    if (req.query.search?.trim()) query.$or = ["title", "company", "skills"].map((field) => ({ [field]: { $regex: req.query.search.trim(), $options: "i" } }));
    res.json({ jobs: await Job.find(query).sort({ createdAt: -1 }).lean() });
  } catch (error) { next(error); }
};

exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, active: true }).lean();
    if (!job) return res.status(404).json({ message: "Job not found." });
    res.json({ job });
  } catch (error) { next(error); }
};
