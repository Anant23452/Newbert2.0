const { getLeaderboard } = require("../services/leaderboardService");
exports.list = async (req, res, next) => { try { const scope = req.query.scope === "global" ? "global" : "college"; res.json(await getLeaderboard({ userId: req.auth.id, scope, search: String(req.query.search || "").trim() })); } catch (error) { next(error); } };
