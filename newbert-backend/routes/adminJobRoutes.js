const router = require("express").Router();
const requireAuth = require("../middleWare/authMiddleware");
const User = require("../Models/User");
const { createAdminJob, deleteAdminJob, listAdminJobs, refreshAdminJob, updateAdminJob, updateAdminJobStatus } = require("../Controllers/jobController");

async function requireAdmin(req, res, next) { try { const user = await User.findById(req.auth.id).lean(); const allowed = (process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean); if (!user || !allowed.includes(String(user.email).toLowerCase())) return res.status(403).json({ message: "Admin access is required." }); next(); } catch (error) { next(error); } }
router.use(requireAuth, requireAdmin);
router.get("/jobs", listAdminJobs);
router.post("/jobs", createAdminJob);
router.post("/jobs/:id/refresh", refreshAdminJob);
router.patch("/jobs/:id", updateAdminJob);
router.patch("/jobs/:id/status", updateAdminJobStatus);
router.delete("/jobs/:id", deleteAdminJob);
module.exports = router;
