const router = require("express").Router();
const requireAuth = require("../middleWare/authMiddleware");
const User = require("../Models/User");
const { analyzeRawAdminJob, createAdminJob, deleteAdminJob, listAdminJobs, refreshAdminJob, updateAdminJob, updateAdminJobStatus } = require("../Controllers/jobController");
const { analyzeAdminCourse, createAdminCourse, listAdminCourses } = require("../Controllers/courseController");

async function requireAdmin(req, res, next) { try { const user = await User.findById(req.auth.id).lean(); const allowed = (process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean); if (!user || !allowed.includes(String(user.email).toLowerCase())) return res.status(403).json({ message: "Admin access is required." }); next(); } catch (error) { next(error); } }
router.use(requireAuth, requireAdmin);
router.get("/jobs", listAdminJobs);
router.get("/courses", listAdminCourses);
router.post("/courses/analyze", analyzeAdminCourse);
router.post("/courses", createAdminCourse);
router.post("/jobs/analyze-raw", analyzeRawAdminJob);
router.post("/jobs", createAdminJob);
router.post("/jobs/:id/refresh", refreshAdminJob);
router.patch("/jobs/:id", updateAdminJob);
router.patch("/jobs/:id/status", updateAdminJobStatus);
router.delete("/jobs/:id", deleteAdminJob);
module.exports = router;
