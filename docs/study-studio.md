# Study Studio and public skill comparison

Study Studio is available at `/study`. The navigation item previously labelled Notes now opens it. The existing semester library remains at `/notes`; its bookmarks, completion controls, admin-published resources and revision worksheets are preserved. Today resumes either a lecture or a legacy unit using the appropriate route.

## Course content

The catalogue was manually checked against [Newbert's channel](https://www.youtube.com/@newbert2025), Videos, Live and [Playlists](https://www.youtube.com/@newbert2025/playlists) on 11 September 2026. It contains 44 normal videos and one archived exam revision session across 12 subjects. The channel's short is excluded. Lecture titles are shortened for navigation and durations are approximate.

`newbert-frontend/src/data/studyCatalog.js` contains the actual video IDs and source playlist URLs. Coverage labels describe published material, not a complete university syllabus. The Control Systems publisher notes link comes from that video's description. No missing PDF links have been invented.

`newbert-frontend/src/data/studyGuides.js` contains original subject companions, worked examples and recall prompts. These are introductory subject notes, not video transcripts, exhaustive lecture notes, or a claim about each video's exact coverage. Students can also export their own notebook and the companion as Markdown.

To add a published lecture, check its channel, subject, unit, part and duration; then add its ID to the matching catalogue collection in study order. To add a subject, also add its companion. The existing Admin Notes page continues to manage semester resources. There is no automatic channel synchronization.

## Learning workflow

- Embedded YouTube lectures with native controls, saved resume positions, focus view, timestamp jumps and a repeat-last-30-seconds control.
- Up to 80 editable notes or questions per lecture, each up to 1,500 characters. Questions can be resolved and reopened.
- A saved recall answer, an answer guide, and self-ratings scheduling review today, in three days or in seven days. Ratings are not assessed proficiency scores. Completion is a separate student action.
- Subject filters, course progress and a personal return/review queue. No synthetic progress is seeded.
- Responsive layouts, keyboard focus indicators, day/night styling and reduced-motion support.

Playback uses the [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference) and privacy-enhanced embedding. If YouTube cannot connect or a video disallows embedding, the notebook remains usable and an external YouTube link is available. Playback positions save approximately every 15 seconds while playing and on playback state changes; the last few seconds can be lost when closing abruptly.

## Storage and account boundaries

Authenticated progress uses the existing StudyProgress collection. The new `/api/profiles/lecture-progress` read route and existing `/api/profiles/learning-progress` update route both run behind authentication and scope queries to `req.auth.id`. Overview responses omit notebook text. Legacy study keys are still accepted.

Local drafts and indexes are separated by account and lecture. Guests use a separate browser-only namespace. Account requests time out after 15 seconds, retaining local edits with a manual Retry action when possible. Local drafts are stored on the device; guest notes do not automatically transfer on sign-in. This is not a simultaneous collaborative editor: concurrent edits to the same note on different devices can overwrite each other. Unsynced additions are merged by note ID on reconnect. Export is available as a portable copy.

Restart/redeploy the backend as well as rebuilding the frontend. Existing MongoDB records need no destructive migration; schema defaults support older records. This change does not seed or alter existing user data.

## Profile comparison

Other students' public profiles offer Compare with me. The panel compares public skill names with the viewer's skills, normalizing common aliases. It shows shared skills, additional public skills to explore, and links to filtered learning resources. Skill overlap measures listed names, not proficiency.

Available counts compare solved LeetCode problems, public GitHub repositories and publicly featured projects (up to three for each student). Private or missing peer data stays unavailable. Private profiles and self-comparison are excluded. Existing alumni comparison features are preserved.

## Validation

Production Vite build and ESLint on changed frontend code pass. Forty automated checks cover catalogue/link integrity, scheduling, comparison semantics, authenticated account scoping, input validation, model compatibility, privacy and Today regressions. Browser checks used an isolated, clearly labelled sample account outside the repository: real YouTube playback, timestamp seeking, repeat segments, edited notes after refresh, recall scheduling, completion, comparison filters, mobile layouts, guest/account separation, offline reads and legacy bookmarks. Database writes were mocked for these checks; a live production database was not used.
