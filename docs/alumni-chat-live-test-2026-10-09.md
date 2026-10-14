# Alumni chatbot live test — 9 October 2026

Target: https://www.newbert.in/alumni/onboarding
Account: newbert.qa.20261009@example.com (existing dummy)
Profile converted from class 2028 student to class 2025 alumni using the normal profile editor. College retained as Rajkiya Engineering College, Banda; branch Computer Science and career target Software Engineer.
Story name corrected to QA Alumni Test — Synthetic. Story remains an unpublished draft.

## Executed live placement journey

Intake accepted Alumni, 2025, and empty optional LinkedIn/GitHub/LeetCode/resume inputs. Import review displayed graduation year, a warning that suggestions are not verified, and a confirmation checkbox. Confirm started the interview. No third-party profile was fetched and no resume was uploaded in this pass.

| Question | Dummy answer / result |
|---|---|
| Name | Corrected old draft value iou to QA Alumni Test — Synthetic; review updated |
| College | REC Banda selected from verified suggestions |
| Branch | Computer Science and Engineering |
| Graduation | 2025 confirmed during intake |
| Degree | B.Tech |
| Introduction | Skipped |
| Academics | CGPA 11 rejected by native validation; 8.2 saved; no backlogs |
| Professional links | Existing optional skip retained |
| Coding profiles | Empty optional intake; no connections |
| Career path | Campus placement; triggered placement offer and GATE follow-up |
| Offer | Synthetic TCS / Software Engineer example; no salary |
| Also attempted GATE | No saved after retest |
| DSA preparation | No saved; DSA detail question excluded |
| Selection-time skills | React, JavaScript saved |
| Preparation timing | Third year, 6–9 months selected |
| Preparation phases | Skipped |
| Projects | Manual QA Demo Task Planner with synthetic description saved |
| Internships | Skipped |
| Interview rounds | Skipped |
| Resources | Skipped |
| Advice | Clearly marked QA TEST STORY text saved |
| Extra lessons | Skipped; observed adapted placement-specific question wording |
| Mentorship | NO saved after retest |

23 of 23 applicable questions completed, including optional skips. Review showed confirmed answers and summary. Editing the name persisted. Full page reload retained completed draft and corrected name. Publish was disabled without approval, enabled after checking approval, and disabled again after unchecking. No publication performed.

## Findings and suggestions

1. Preparation range loses information: selecting 6–9 months yields a stored/reviewed value of 7 months and summary text approximately 7 months. Preserve the selected range (6–9 months), or explain and confirm that a representative value will be saved.
2. Visibility differs from the requested workflow: review states all completed answers become public and offers one publication checkbox. No field-level Public / College / Private controls are present for this new intake flow. If per-field approval is required, restore these controls and show an audience preview before publication.
3. Two immediate select-and-save sequences (GATE No and mentorship NO) returned Enter an answer or skip this optional question. Re-selecting, observing selection, then saving succeeded. Treat as a possible fast-interaction/state timing issue; negative values themselves are supported. Investigate whether selection state and submit handlers can observe different values. Concurrent dictation also modified profile fields earlier; those edits are not counted as product bugs.
4. Missing-source review only showed graduation year. It did not provide explicit rows stating LinkedIn/GitHub/LeetCode/resume were not supplied or what remains unknown. Add those rows if the requirement is a source-by-source background summary even with empty inputs.

## Coverage limits

This is a completed placement path with missing external sources and optional skips, not every possible branch. Resume parsing/upload, actual inaccessible/private profiles, AI free-text extraction, voice capture, GATE/PSU/higher-study journeys, nested interview/internship collections, and publication itself remain untested live. Prior unit results are separate evidence and cannot establish these deployed UI paths work. No application code changed.
