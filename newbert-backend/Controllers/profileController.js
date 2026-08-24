const Profile = require("../Models/Profile");
const User = require("../Models/User");

function response(profile, user) {
  return { name: user.name, email: user.email, college: profile.college || "", branch: profile.branch || "", graduationYear: profile.graduationYear || "", bio: profile.bio || "", targetCompany: profile.targetCompany || "", github: profile.githubUrl || "", leetcode: profile.leetcodeUrl || "", linkedin: profile.linkedinUrl || "", avatar: profile.avatarUrl || "", cover: profile.coverUrl || "", skills: profile.skills, currentStreak: profile.currentStreak, longestStreak: profile.longestStreak };
}

exports.getMyProfile = async (req, res, next) => {
  try {
    const [user, profile] = await Promise.all([User.findById(req.auth.id), Profile.findOne({ userId: req.auth.id })]);
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json(response(profile || new Profile({ userId: user._id }), user));
  } catch (error) { return next(error); }
};

exports.updateMyProfile = async (req, res, next) => {
  try {
    const userUpdates = {};
    if (typeof req.body.name === "string" && req.body.name.trim()) userUpdates.name = req.body.name.trim();
    if (typeof req.body.email === "string" && req.body.email.trim()) userUpdates.email = req.body.email.trim().toLowerCase();
    if (Object.keys(userUpdates).length) await User.findByIdAndUpdate(req.auth.id, { $set: userUpdates }, { runValidators: true });
    const profile = await Profile.findOneAndUpdate({ userId: req.auth.id }, { $set: { college: req.body.college, branch: req.body.branch, graduationYear: req.body.graduationYear, bio: req.body.bio, targetCompany: req.body.targetCompany, githubUrl: req.body.github, leetcodeUrl: req.body.leetcode, linkedinUrl: req.body.linkedin, avatarUrl: req.body.avatar, coverUrl: req.body.cover, skills: req.body.skills } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    const user = await User.findById(req.auth.id);
    return res.json(response(profile, user));
  } catch (error) { return next(error); }
};
