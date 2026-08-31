const router = require("express").Router();
const requireAuth = require("../middleWare/authMiddleware");
const { cancelMyRequest, createRequest, listMyRequests, listReceivedRequests, updateReceivedRequest } = require("../Controllers/mentorshipController");
router.use(requireAuth);
router.post("/requests", createRequest);
router.get("/requests/mine", listMyRequests);
router.patch("/requests/:id/cancel", cancelMyRequest);
router.get("/requests/received", listReceivedRequests);
router.patch("/requests/:id/respond", updateReceivedRequest);
module.exports = router;

