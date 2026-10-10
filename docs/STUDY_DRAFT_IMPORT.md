# Study Studio Gemini drafts

Choose a subject and video in `/admin/study`, then expand **Import questions or generate from video with Gemini**.

- Paste multiple questions, options and any supplied answers. Generate, inspect warnings and answers, select questions and add them to the editor. Edit before saving/publishing.
- For actual PYQs provide the exam, year and original HTTPS paper link. Provenance comes from the administrator, never Gemini. PYQ MCQs are retained as written practice with their options and answer to preserve provenance in the existing data model.
- Video mode uses the canonical YouTube URL as Gemini video input, creates a summary and up to five practice drafts. It does not promise a verbatim transcript. Inaccessible videos, model support and API quotas can prevent generation.
- Draft requests do not save or publish anything. Existing questions are appended only after review, within the existing limits of 10 MCQs and 20 written questions.
- Requires the existing backend `GEMINI_API_KEY` and a video-capable `GEMINI_MODEL`. No new frontend secret. For original YouTube descriptions, configure `YOUTUBE_API_KEY` with YouTube Data API v3 enabled; the existing oEmbed fallback has no description.
- The new authenticated admin endpoint is `POST /api/admin/study/generate-draft`. Requests are limited to one per admin per minute per backend instance and 20,000 pasted characters. Gemini responses are validated using the same rules as published lessons. Unclear source questions and generated solutions require teacher review.

Validation: run `node --test tests/studyDraft.test.js tests/studyContent.test.js tests/academicStudy.test.js` in the backend, targeted frontend eslint and frontend build. Live Gemini generation requires authenticated staging with a configured key; automated tests stub the provider and do not consume quota.
