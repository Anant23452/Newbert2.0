const { prepareStudyRequest, answerStudyRequest } = require('../services/studyAssistantService');
exports.createStudyAssistant = (answer = answerStudyRequest) => async (req, res) => {
  try { prepareStudyRequest(req.body); }
  catch (error) { return res.status(400).json({message:error.message}); }
  try { return res.json(await answer(req.body)); }
  catch (error) { return res.status(error.status || 503).json({message:error.publicMessage || 'The study tutor is unavailable right now. Your notebook is still available.'}); }
};
exports.askStudyAssistant = exports.createStudyAssistant();
