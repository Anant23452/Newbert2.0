const express = require("express");
const { explainPlan, testAI } = require("../Controllers/aiController");
const aiRateLimit = require("../middleWare/aiRateLimit");
const requireAuth = require("../middleWare/authMiddleware");

const router = express.Router();
router.use(requireAuth);
router.use(aiRateLimit);
router.get("/test", testAI);
router.post("/plan-explanation", explainPlan);

module.exports = router;
