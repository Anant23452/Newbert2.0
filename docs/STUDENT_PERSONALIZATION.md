# Student Personalization Handover

## What changed

Existing routes, admin systems, matching engines, leaderboard, mentoring, and plan services remain available. This update connects the existing systems and improves their data handling; it does not replace the AI architecture or train a new model.

### Profile and account sync

Essential setup now requires a canonical college, branch, graduation year (2020-2040), and career target. "Still exploring" is supported. GitHub, LeetCode, LinkedIn, CGPA, projects, images, and bio remain optional. Existing students with missing essential fields will be asked to finish them at their next login. No destructive database migration is required.

The frontend saves through PUT /api/profiles/me first. The response contains syncNeeded, calculated on the server. AuthContext then starts POST /api/profiles/sync for those providers while the student continues using the app. It also refreshes stale integrations on login/session restoration. Unchanged successful data is reused for six hours. A stored 30-second attempt cooldown and in-process lock limit duplicate calls; the frontend also prevents duplicate sync requests.

Provider success and errors are independent. A LeetCode outage does not discard a saved profile or successful GitHub data. Retry requests can select only the failed provider. LinkedIn is a stored link, not a promise of full work-history or skills extraction. Submitting a public username is also not proof that the student owns that account; OAuth ownership verification is separate future work.

Partial profile edits preserve untouched data. Client-supplied skill scores and sources do not establish verified evidence. Changed account identities clear obsolete stats, and the synchronization path does not transfer activity from the previous account. Compare-and-set on the profile update time prevents a late sync from overwriting a newer profile edit.

Important files: backend services/profileCompletionService.js, services/profileSyncPolicy.js, Controllers/profileController.js; frontend Context/AuthContext.jsx, pages/Profile.jsx, components/ProfileSyncStatus.jsx, Routing.jsx.

### Today dashboard

Signed-in students with complete profiles see Today at /. Guests retain the homepage. GET /api/profiles/today reads the current student's existing ImprovementPlan, SavedJob, and StudyProgress records. It shows unfinished plan tasks, completed tasks in the last seven days, upcoming deadlines on verified saved/planning jobs, and an unfinished study unit. There are no invented student scores or tasks. Empty accounts receive links to start their plan and explore learning.

Completing a task uses the existing improvement-plan API. A checked task is self-reported progress, not verified competency. It does not award fake GitHub/LeetCode activity. Evidence review and verification continue through the existing plan system.

Application status selects on saved Jobs use the existing PATCH /api/jobs/:id/save endpoint. Dates use Indian display formatting. Status is not updated just because someone clicks an external application link. The current Jobs catalog still determines which opportunities are visible; a separate comprehensive archive of expired applications is not part of this update.

### Notes and team publishing

The same electrical, civil, and IT branch/semester/unit outlines are retained and shared by the student and admin pages through frontend data/notesCatalog.js. Stable unit keys use branch:semester:subject:unitNumber.

Use /admin/notes with an account allowed by the existing ADMIN_EMAILS policy. Select the unit, add published HTTPS lecture/PDF/question/syllabus links, record the syllabus session, and publish. Save as a draft or uncheck Published to hide resources. The backend enforces the existing admin middleware. Content is referenced by URL, not uploaded to MongoDB as video/PDF binary data.

Public GET /api/notes/resources returns published resources only. GET/PATCH /api/profiles/learning-progress stores saved/completed unit state for the authenticated user. Guests have browser-local progress, separate from signed-in account data. A unit changes only after a successful save; errors expose a retry. Saved unfinished units are available from Today.

Unpublished units retain a plainly labeled revision worksheet and a YouTube search link. Neither is presented as official notes or a published Newbert lecture. The team must supply real PDFs, lecture links, previous-year questions, and checked syllabus versions. The existing catalog is not a complete verified curriculum for every year.

### Resume workspace

The three stages remain: resume/role, review/tailor, senior interview preparation. PDF.js reads actual PDF text in the browser; students can also upload text or paste their resume. Files are limited to 5 MB and PDFs to 15 pages. Scanned PDFs without text need pasted text; there is no OCR service.

The editable draft starts from the supplied resume rather than generated claims. The review highlights actual matching keywords and original evidence lines. Its percentage is tracked keyword coverage only, not an ATS score, competence rating, or hiring probability. This is a deterministic review tool; no new generative resume-rewriting model was added.

Students confirm accuracy before exporting a PDF with jsPDF or downloading UTF-8 text. The standard PDF font has limited character coverage; unsupported characters produce a message and the text download preserves them. Original PDF layout, tables, embedded images, and fonts are not reproduced. Resumes are held in browser memory, not sent to the backend or saved across a reload.

The alumni stage reads existing privacy-filtered public alumni APIs and excludes demo records. It shows an honest empty state when no exact company match exists. Practice prompts are explicitly distinguished from a senior's reported interview questions. Existing alumni profile links provide the full public record.

### Navigation and trust

Today/Home, My Plan, and Jobs remain directly accessible. Explore contains Alumni, Resume AI, Courses, Notes, Leaderboard, and Mentorship. The mobile menu retains all destinations. Admin Notes is accessible through the menu to admins, and backend authorization remains authoritative.

Homepage statistics that were hardcoded were replaced with product-context labels. Sample journeys are marked illustrative. Course reviews show their sample size and do not imply that taking a course guarantees a package. Next Unlocks no longer treats a large LeetCode problem count alone as verified DSA competence, and its job evidence query excludes unverified, inactive, and expired jobs.

## Verification and deployment

Backend: npm test. Frontend: npm run build, then node --test tests/resumeReview.test.js. Controller tests mock MongoDB/provider calls; they do not contact production. Browser QA uses isolated mocked API fixtures to check onboarding, automatic sync/partial retry, Today task completion, study persistence, real PDF extraction/export, admin publication, and mobile overflow. It does not prove live provider availability or production MongoDB connectivity.

Deploy the backend and frontend together. New MongoDB collections (StudyProgress and NoteResource) are created through the existing Mongoose configuration. No new API secrets are needed. Keep VITE_API_URL pointing to Render and preserve the Vercel SPA rewrite. Confirm indexes are created according to your production database policy.

With two real test accounts, verify: incomplete setup redirects; saving connects only the submitted accounts; account B cannot see account A's study/task state; one failed provider can retry independently; a saved note persists after signing in elsewhere; a non-admin receives 403 from /api/admin/notes; a published unit appears publicly; and an unpublished unit does not. Test real provider rate limits and credentials separately.

## Still requires real product evidence

Newbert cannot honestly be called "10/10" based on code changes alone. A real student pilot is still needed. Measure profile completion, first meaningful task completion, weekly return, recommendation usefulness, and mentor/student feedback. Real alumni outcomes, verified curriculum content, account ownership checks, richer multilingual PDF export, and outcome-based model evaluation must be supplied or validated before stronger claims are made. No offer probabilities, invented alumni, or training-data claims were added.
