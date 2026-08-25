const express = require("express");
const requireAuth = require("../middleWare/authMiddleware");
const { generateMyPlan, getMyPlan, recalculateMyPlan, updateTask } = require("../Controllers/planController");

const router = express.Router();
router.use(requireAuth);
router.get("/me", getMyPlan);
router.post("/generate", generateMyPlan);
router.post("/recalculate", recalculateMyPlan);
router.patch("/tasks/:taskId", updateTask);

module.exports = router;
