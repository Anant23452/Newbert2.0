# Alumni interview: implementation and testing handoff

Status: implemented locally; not committed, pushed or deployed. Existing unrelated workspace artifacts are preserved.

## New flow

1. Choose Student or Alumni. Student accounts are blocked from the interview by the backend using their saved graduation year; guest visitors must declare Alumni and provide an eligible graduation year.
2. Supply optional LinkedIn, GitHub and LeetCode profile links plus selected resume text from a PDF/text file.
3. Import public GitHub repository metadata and LeetCode metrics. Gemini suggests name, education and resume background. LinkedIn contents are not scraped; the supplied link is saved.
4. Correct imported fields and the resume background; explicitly confirm them.
5. Answer one question at a time. Gemini can personalise question wording and hints from corrected background and prior confirmed answers. The questionnaire still owns topics and required fields. Provider failures leave standard questions available.
6. Review the complete public story, then explicitly publish. New submissions in this flow have public story fields, including optional salary when supplied; no field-visibility question is shown. The same Alumni record powers the Wall and story detail.

Voice input remains speak → edit transcript → submit in supporting browsers. Original resumes, raw transcripts, editing credentials and internal import context are not public story fields. No automatic verified badge is assigned. Graduation-year checks are eligibility checks on supplied/account data, not proof of graduation. Existing previously published profiles retain their prior visibility until explicitly updated through the new public flow.

## What Gemini does

Gemini receives interview instructions, a constrained topic/output schema, corrected resume background, public source observations and confirmed answers. This customises its behaviour; it is not model training or fine-tuning. Source observations cannot prove personal authorship, employment or selection-time skill. The final story uses confirmed structured answers, not generated question text.

## Acceptance checks for the testing chat

- Student account: interview unavailable; direct alumni API requests rejected.
- Guest: Student option cannot start an interview; future graduation year rejected by backend.
- Alumni with no links/resume: import/confirmation and manual interview remain usable.
- GitHub/LeetCode: correct user links accepted; wrong domains and repository/problem links rejected; unavailable providers show a non-blocking message.
- Resume: PDF/text accepted within limits; scanned PDF error explained; remove contact details and shorten to 6,000 selected characters; check corrected background reaches follow-up question context.
- Correct a suggested name or profile link before confirmation; stale source metrics must not follow a changed link.
- Refresh during intake/review and after saving an answer; submitted data resumes. Guest editing depends on the browser key.
- Gemini unavailable or rate-limited: interview still shows its standard question; no AI success is fabricated.
- Text and voice: transcript editable, explicit submission required, microphone rejection and unsupported browsers keep text entry working.
- New public flow: no privacy controls/question; public preview includes optional salary when entered. Original files/raw intake text never appear in the public API.
- Publish/re-publish: same alumni record updated; story and summary visible on the Wall/detail; incomplete required answers rejected.
- Use isolated fixtures for publication tests, not fictional profiles in production.

Automated checks cover existing conversations/publication/privacy compatibility, intake eligibility, import correction, public story behaviour, Gemini fallback and resume input. Production build and focused frontend lint pass. Actual live Gemini responses, microphone behaviour and browser layout remain acceptance checks for the next testing stage.
