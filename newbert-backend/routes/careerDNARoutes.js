const router = require('express').Router();
const auth = require('../middleWare/authMiddleware');
const { optionalAuth } = require('../middleWare/authMiddleware');
const c = require('../Controllers/careerDNAController');

// Profile link management (requires auth + alumni record)
router.post('/profiles/connect', auth, c.connectProfile);
router.delete('/profiles/:platform', auth, c.disconnectProfile);
router.post('/profiles/:platform/sync', auth, c.syncProfile);
router.get('/profiles', auth, c.getProfiles);

// Career DNA endpoints
router.get('/career-dna', auth, c.getCareerDNA);
router.get('/:id/career-dna', optionalAuth, c.getAlumniCareerDNA);
router.get('/:id/evidence', optionalAuth, c.getAlumniEvidence);
router.get('/:id/compare', auth, c.compareWithAlumni);

// GitHub evidence
router.get('/github-evidence', auth, c.getGithubEvidence);

module.exports = router;
