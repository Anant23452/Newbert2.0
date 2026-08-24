const Alumni = require("../Models/Alumni");

exports.listAlumni = async (req, res, next) => {
  try {
    const query = { verified: true };
    if (req.query.college?.trim()) query.college = { $regex: `^${req.query.college.trim()}$`, $options: "i" };
    res.json({ alumni: await Alumni.find(query).sort({ createdAt: -1 }).lean() });
  } catch (error) { next(error); }
};

exports.getAlumni = async (req, res, next) => {
  try {
    const alumni = await Alumni.findOne({ _id: req.params.id, verified: true }).lean();
    if (!alumni) return res.status(404).json({ message: "Alumni profile not found." });
    res.json({ alumni });
  } catch (error) { next(error); }
};
