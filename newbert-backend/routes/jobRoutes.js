const router = require("express").Router();
const requireAuth = require("../middleWare/authMiddleware");
const { getJob, jobAnalysis, listJobs, recommendedJobs, saveJob, unsaveJob, updateSavedJob } = require("../Controllers/jobController");

router.get("/", listJobs);
router.get("/recommended", requireAuth, recommendedJobs);
router.get("/:id/analysis", requireAuth, jobAnalysis);
router.post("/:id/save", requireAuth, saveJob);
router.delete("/:id/save", requireAuth, unsaveJob);
router.patch("/:id/save", requireAuth, updateSavedJob);
router.get("/:id", getJob);
module.exports = router;
