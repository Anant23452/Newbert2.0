const express = require("express");
const requireAuth = require("../middleWare/authMiddleware");
const controller = require("../Controllers/improvementPlanController");

const router = express.Router();
router.use(requireAuth);
router.get("/next-unlocks", controller.getNextUnlocks);
router.post("/preview", controller.previewImprovementPlan);
router.post("/", controller.createImprovementPlan);
router.get("/:planId", controller.getImprovementPlan);
router.patch("/:planId/tasks/:taskId", controller.updateImprovementTask);
router.post("/:planId/evidence", controller.submitEvidence);

module.exports = router;
