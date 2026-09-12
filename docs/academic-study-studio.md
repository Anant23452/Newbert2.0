# Academic Study Studio

Implemented 12 September 2026. `/study` now opens three branches, then year, semester, subject and unit. The original channel shelf remains at `/study/lectures`; `/study/:courseId`, `/notes`, legacy bookmarks and original lecture notebooks continue to work.

## Curriculum and year selection

The year estimate assumes a four-year B.Tech and a July academic boundary in Asia/Kolkata. Class of 2027 opens Year 4 in 2026–27. Missing, future or graduated profiles are not assigned a false current year. Students can browse all years and correct their starting year with a device/account/session-scoped preference without changing their graduation year. Elective selections are device/account/branch-scoped.

The catalogue contains 199 subject entries, including distinct first-year stream editions, each with five condensed unit headings. Sources are official AKTU 2022 first-year, 2023 second-year, 2024 third-year and 2025 final-year syllabi, plus separate 2026 first-year schemes. New intake defaults to 2026; earlier cohorts retain the B-series first-year archive. Sources and editions are linked in each subject. This is a maintained snapshot, not an automatic university feed. College semester groups and elective eligibility still apply. Full elective PDFs also include papers not yet indexed on the shelf. Labs and projects retain their practical structure in the official scheme.

Update both frontend and backend `academicCatalog.json` files together; a test enforces parity. Match videos only to verified channel collections and unit numbers. The 2026 first-year scheme does not automatically inherit older B-series videos. Missing videos are explicitly marked; no substitute video IDs, fake progress or student records are seeded.

## Classroom

Lectures sit beside Unit guide, My notes, Recall and AI tutor. Cloud Computing BCS071, Artificial Intelligence BCS701 and Project Management BOE070 have original companions, examples and answer guides for all five units. Other units have a condensed syllabus outline, the official full syllabus, personal notes and on-demand tutoring. These are not full lecture transcripts. Interactive examples cover cloud service responsibilities, breadth-first search and critical-path scheduling, with their assumptions stated.

Unit notebooks use `unit:<branch>:<catalog-subject-id>:<unit>` keys. The server validates branch, subject and unit against the catalogue. Video timestamp notes keep the original `lecture:` keys; switching units does not merge video notebooks. Completion and recall ratings are student actions. Unit resume links work from Study Studio and Today. Existing authenticated ownership, bounded notes, offline drafts, manual retry and export behavior apply.

## AI and running the change

`POST /api/profiles/study-assistant` uses existing authentication, per-user rate limiting and the configured Gemini provider. It supports explanations, practice questions, recall feedback and a 25-minute plan in English or Hinglish. The server selects curriculum context. Questions are capped at 1,500 characters and recall answers at 6,000. Provider failures are shown honestly; there is no canned-success fallback. Only the selected unit and submitted text are sent, not a video transcript or the entire notebook. Responses render as plain text and can be downloaded; their cache is device/account/unit-scoped.

Restart/rebuild both frontend and backend, or deploy both for a hosted app. Live tutoring uses the existing `GEMINI_API_KEY` and optional `GEMINI_MODEL`. No frontend secret or database migration is introduced. Local QA uses a separate preview entry and simulated account/API outside the shipped project; live database writes and the external AI provider are not exercised by those checks.

Validation covers graduation-year boundaries, branch/year/semester coverage, catalogue parity, elective restrictions, notebook persistence contracts, account ownership, AI validation and error handling, old lecture compatibility, and Today regressions. Browser checks verify the new flow with isolated data. See `study-studio.md` for original lecture/player and profile-comparison behavior.
