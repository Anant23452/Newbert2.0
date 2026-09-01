const express = require("express");
const requireAuth = require("../middleWare/authMiddleware");
const { generateMyPlan, getMyPlan, listRoadmapTargetJobs, previewMyPlanContext, recalculateMyPlan, updateMilestone, updateTask } = require("../Controllers/planController");

const router = express.Router();
router.use(requireAuth);
router.get("/me", getMyPlan);
router.get("/target-jobs", listRoadmapTargetJobs);
router.post("/preview", previewMyPlanContext);
router.post("/generate", generateMyPlan);
router.post("/recalculate", recalculateMyPlan);
router.patch("/tasks/:taskId", updateTask);
router.patch("/milestones/:milestoneId", updateMilestone);

module.exports = router;
