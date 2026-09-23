const router = require('express').Router();
const aiLimit = require('../middleWare/aiRateLimit');
const controller = require('../Controllers/alumniGuestController');

const requests = new Map();
function limit(key, max, windowMs, res) {
  const now = Date.now();
  for (const [stored, record] of requests) if (record.until <= now) requests.delete(stored);
  const record = requests.get(key) || { count: 0, until: now + windowMs };
  record.count += 1;
  requests.set(key, record);
  if (record.count > max) { res.status(429).json({ message: 'Please wait before trying again.' }); return false; }
  return true;
}

router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.post('/start', (req, res, next) => limit(`start:${req.ip}`, 10, 3600000, res) && next(), controller.start);
router.get('/session', controller.session);
router.use(controller.requireGuest);
router.use((req, res, next) => limit(`guest:${req.guestSession._id}`, 120, 60000, res) && next());
router.post('/answer', controller.answer);
router.patch('/answer/:questionId', controller.answer);
router.post('/skip', controller.skip);
router.post('/back', controller.back);
router.post('/extract', aiLimit, controller.extract);
router.post('/confirm-extraction', controller.confirm);
router.get('/review', controller.review);
router.post('/publish', controller.publish);
router.post('/hide', controller.hide);
router.post('/restart', controller.restart);
router.post('/practice-check', aiLimit, controller.inspectPractice);

module.exports = router;
