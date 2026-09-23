export function normalizeStoryPayload(payload) {
  if (!payload?.session) return { ...payload, session: null, privacyFields: payload?.privacyFields || [] };
  const session = payload.session;
  return {
    ...payload,
    session: {
      ...session,
      answers: session.answers && typeof session.answers === 'object' ? session.answers : {},
      rawAnswers: session.rawAnswers && typeof session.rawAnswers === 'object' ? session.rawAnswers : {},
      skippedQuestions: Array.isArray(session.skippedQuestions) ? session.skippedQuestions : [],
      questions: Array.isArray(session.questions) ? session.questions : [],
      sections: Array.isArray(session.sections) ? session.sections : [],
      missingRequired: Array.isArray(session.missingRequired) ? session.missingRequired : [],
      version: Number.isInteger(session.version) ? session.version : 0,
      completed: Number(session.completed) || 0,
      total: Number(session.total) || 0,
      canPublish: session.canPublish === true,
    },
    privacyFields: Array.isArray(payload.privacyFields) ? payload.privacyFields : [],
  };
}

