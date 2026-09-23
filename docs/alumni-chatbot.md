# Alumni onboarding

Open `/alumni/onboarding` from the Alumni Wall or send that link to a senior. A senior can complete, review and publish a self-reported story without creating an account. Signed-in seniors continue to use their account-backed story. Both use Newbert's existing theme and Alumni Wall. Guest mentorship requests and private evidence uploads are unavailable because there is no account inbox or verified owner.

New members sign up, then visit `/join` for only a verified college and class year. The class year is interpreted at the July India academic boundary: a graduated class enters the senior story conversation; a current student opens Today immediately. Current students can later use the optional **Personalize my profile** prompt on Today to answer the earlier profile questions one at a time at `/profile/complete`. Answers may be skipped, and the student can return to Today at any time.

## Data flow

`AlumniOnboarding` renders one question at a time using `QuestionRenderer` and `AnswerFields`. `config/alumniQuestions.js` owns the question definitions, nested fields and career conditions. `services/alumniQuestionEngine.js` calculates relevant questions, progress and next question from the confirmed answers. Changing a career path or practice platform removes now irrelevant answers from the active story and retains them privately in `inactiveAnswers` for audit. Each submit goes to the authenticated `/api/alumni-chat` route or the guest `/api/alumni-guest` route and saves immediately. A browser refresh loads the saved session; unfinished input is temporarily kept in browser session storage until submitted.

`AlumniChatSession` has one document per user, with submitted answers, original text, AI suggestions, skips, progress, history and optimistic versioning. Profile and User details are offered as *suggested prefill*; the alumni must accept them. `Alumni` is the existing public profile model. Its new `story` field holds the structured conversation, while existing fields are populated for the Wall, matching and roadmap features. Publishing updates the same user's existing Alumni record rather than creating a second record. Existing legacy verified alumni still appear on the Wall. Newly submitted stories are explicitly marked self-reported and unverified.

## Questions and branches

The required minimum is name, college, branch, graduation year, degree, career path, the relevant outcome, skills at selection, preparation, one advice answer and privacy. Salary, links, projects, documents and mentorship are optional. Placement, off-campus and PPO routes ask about an offer; GATE asks about an exam attempt; PSU has its own selection details; other paths ask for a general outcome. A GATE attempt can be added alongside another career path. Only selected practice platforms create link questions. One predefined profile per platform is allowed, while `OTHER` accepts multiple named services. Collections support multiple projects, internships, interview companies and rounds, timeline phases and resources. The server validates types, numbers, dates, links and lengths; it never trusts the React form as the source of truth.

GitHub and LeetCode link checks use Newbert's existing integrations. The displayed metrics are current public metrics and are not identity verification or selection-time counts. Alumni enter their selection-time DSA count separately. Link checks can fail without blocking the conversation.

## AI and confirmation

The optional **Tell it in my words** action sends only that answer to the backend's existing Gemini client (`GEMINI_API_KEY`); no key is bundled into Vite. A question-derived JSON schema and server validation constrain the suggested structure. The prompt forbids invented facts and distinguishes estimates. The original text is saved before Gemini runs. Suggestions are visible and must be confirmed or corrected before becoming structured answers. If Gemini is unavailable, the original answer remains saved and the direct-entry form remains usable. The same account rate limit as Newbert's other AI actions applies.

## Privacy and verification

`PUBLIC`, `COLLEGE_ONLY` and `PRIVATE` can be set for a section or field. Professional details default to public, salary and stipends to college only, and contact/evidence to private. The server filters the canonical story *before* computing legacy aliases, counts and comparison inputs. College-only fields are sent only when the signed-in viewer has the same canonical college ID. Private fields are omitted from all public API responses, including list, detail, job, roadmap and mentorship reads. This filtering is enforced on the server, not with CSS.

Evidence PDF, PNG or JPEG files are stored in the separate `AlumniVerificationDocument` collection (2 MB each, 10 per user); upload/list/download require ownership. Downloads use an attachment response. Evidence and raw answers are never part of the public alumni response. Uploading evidence records a pending review item; it does **not** verify a person, platform, offer or score. A human moderation workflow is still required before assigning verified status.

## API

All `/api/alumni-chat` routes use the existing JWT middleware. Mutations that change a conversation require the current `version`; stale tabs get a conflict instead of silently overwriting changes. Private routes send `Cache-Control: no-store`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/start` | Create or resume the account's session |
| GET | `/session` | Load saved progress |
| POST | `/prefill` | Accept or dismiss proposed account details |
| POST, PATCH | `/answer`, `/answer/:questionId` | Submit or edit one answer |
| POST | `/skip`, `/back` | Skip an optional answer or revisit the prior question |
| POST | `/extract`, `/confirm-extraction` | Suggest with Gemini, then confirm/correct |
| GET | `/review` | Read the complete owner review and audience previews |
| POST | `/publish`, `/hide`, `/restart` | Publish/update, hide, or reset a draft |
| POST | `/practice-check` | Optional current GitHub/LeetCode metric check |
| GET, POST | `/documents` | List/upload private evidence |
| GET | `/documents/:id` | Owner-only evidence download |

The table above describes `/api/alumni-chat`. Guest routes are described below. Public discovery and profile viewing remain in the existing `/api/alumni` routes.

## Local verification

Run backend tests from `newbert-backend` with `node --test tests/*.test.js`; run `npm run build` in `newbert-frontend`. The API tests exercise real Express routes and schemas using an in-memory model harness; they do not call a live MongoDB or Gemini account. For an isolated UI preview, run `node scripts/previewAlumniChat.js` (add `--seed` for a clearly fictional filled draft) in the backend, and `npx vite --config qa-flow.vite.mjs` in the staged frontend QA copy. The preview entry is local test infrastructure and is not installed into the real project. The fictional fixture lives at `tests/fixtures/alumniChatDemo.js` and is never imported by `server.js`.

For a real local run, use the existing `newbert-backend/.env` containing `MONGO_URI` and `JWT_SECRET`, plus `GEMINI_API_KEY` only if natural-language extraction is desired. Start the existing backend and frontend as usual, sign in, visit the Alumni Wall, and follow **Share Your Journey**. Check desktop and narrow viewport, refresh after a submitted answer, return to an earlier answer, switch placement to GATE, add and remove collection entries, set a salary private, inspect both audience previews, publish, then inspect the public Wall/profile from another account. A live Gemini response, database persistence and moderator verification require the corresponding local services/accounts; the automated harness does not claim to test those external systems.

## Guest stories and minimal member setup

The account route remains `/api/alumni-chat` with JWT authorization. The guest route is `/api/alumni-guest` with `start`, `session`, `answer`, `answer/:questionId`, `skip`, `back`, `extract`, `confirm-extraction`, `review`, `publish`, `hide`, `restart`, and `practice-check`. A guest receives a random private editing key; only its SHA-256 hash is stored in the separate `AlumniGuestSession` collection. The key is sent in the `X-Alumni-Guest-Token` header, saved in that browser, and never exposed in public alumni responses. Losing browser storage loses access to the draft or published story. Starts and actions have rate limits, mutations use optimistic versioning, and private responses use `Cache-Control: no-store`.

The guest must review their story and confirm publication. Publication upserts a public `Alumni` record tied to the guest session, marked self-reported and unverified, with mentorship disabled. Account stories continue to upsert by account ID. The frontend normalizes sparse old API responses before rendering questions, so a missing `answers` object no longer crashes onboarding. The junior profile chat saves each response through the existing profile API; the required join fields remain college and class year. The student can use Today before adding branch, goals, skills, links, or projects.

Deploy frontend and backend together. The guest API must be available before the new browser flow can publish. For isolated local UI verification, use `node scripts/previewAlumniChat.js` in the backend and `npx vite --config qa-flow.vite.mjs` in the staged frontend copy; that QA entry is not part of the installed project. Automated tests use an in-memory harness and do not claim to test live MongoDB, Gemini, or production Vercel.
