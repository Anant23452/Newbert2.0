# Study Studio implementation

## Existing features preserved

- Academic year inference from graduation year with the July India session boundary.
- Profile branch detection, branch navigation, semester and curriculum selection.
- All existing bundled lectures, original lecture URLs, and notebook keys.
- Personal timestamp notes, unit notes, completion, recall and tutor tools.
- Existing notes library and administration.
- Empty subjects are hidden from student shelves, not deleted from the syllabus.

## New student features

- Published database lessons appear in the existing branch/year/semester/subject/unit hierarchy.
- Under each video: Ask a mentor, Notes & resources, Practice.
- Questions attach to an editable timestamp; class discussion or private-to-staff visibility.
- Question owners can resolve or reopen their questions.
- Mentor replies are labelled separately from AI assistance.
- Resources have a title, type and public HTTPS link.
- Admin-written quizzes have explanations after server grading. Answer keys are not sent in the public catalog.
- `/study/my-doubts` shows the student's questions and replies; videos can open inside the page at the question time.

## Administration

- `/admin/study`: use existing sign-in with an email allowed by `ADMIN_EMAILS`.
- Choose branch, year, semester, scheme and subject. Existing empty syllabus subjects remain available here.
- Create a custom subject with five unit headings, or use an existing subject.
- Paste a single YouTube video link and fetch metadata, then review/edit the lesson details.
- Attach resource links, set lesson ordering and mentor display name, and optionally add up to ten quiz questions.
- Save draft, preview or publish. Editing a bundled lecture creates an override without changing its video/notebook identifier.
- Unpublish returns a lesson to draft; existing student notes are retained.
- Duplicate links within the same subject require editing the existing lesson.
- `/admin/study/doubts`: admins and emails allowed by `MENTOR_EMAILS` can reply to public or private questions.
- Mentor display names on lesson cards do not grant access. Access checks occur on the backend.

## Configuration

No new packages or file storage service are needed. MongoDB stores subjects, lesson metadata and questions. Resource files remain at the supplied public links. Videos remain hosted on YouTube.

- `ADMIN_EMAILS`: existing admin allowlist, comma-separated.
- `MENTOR_EMAILS`: optional separate mentor allowlist, comma-separated.
- `YOUTUBE_API_KEY`: optional server-only YouTube Data API v3 key. Enable YouTube Data API v3 in the key's Google Cloud project.

Without a YouTube API key, import uses YouTube oEmbed for title/channel name and thumbnail; the admin enters summary/duration. With a key, the backend retrieves description, duration and embedding status. Publishing rechecks video availability. Region restrictions or later YouTube changes can still affect playback.

The current implementation shows replies in the classroom and My questions page; it does not send email/push notifications. Quizzes are checked per attempt; there is no persistent quiz-score history. Staff inbox and classroom return the newest 100 questions per request. Follow-up threads, helpful votes and inbox pagination can be extended later.

## Testing

Automated checks cover input bounds, supported YouTube hosts, metadata fallback, embedding rejection, quiz grading, answer-key exclusion, private-question query scopes, server ownership, staff allowlists, managed catalog refresh/unpublish, existing class/branch inference, existing progress and tutor behavior.

Before production release, run an authenticated staging walkthrough:

1. Sign in as an allowed admin and as a normal student in separate browser sessions. Confirm the student cannot manage content or access the mentor inbox.
2. Import a real video into an existing empty subject. Save a draft and verify it is absent from student shelves.
3. Attach a notes link and one quiz; publish and verify branch/year/semester/unit placement.
4. Ask public/private timestamped questions as student A. Verify student B sees only the public question.
5. Reply as a mentor, verify the reply on student A's My questions page, then resolve/reopen it.
6. Submit correct/incorrect quiz answers and check explanations.
7. Unpublish the lesson, verify it disappears and existing notes remain stored. Republish and verify notes resume.
8. Test year/branch defaults for a real profile and mobile layout.

Local build and automated tests do not confirm live Render/Vercel deployment or production credentials. This work has not been deployed.
