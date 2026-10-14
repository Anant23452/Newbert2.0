# Sign-up and Rajkiya onboarding testing — 9 October 2026

## Scope
Live site: https://www.newbert.in/. Supported college dataset: Uttar Pradesh Rajkiya Engineering Colleges only, as confirmed by the project owner. IIT Delhi and other outside-dataset searches are expected exclusions, not bugs. AKTU is a university query and is not a required college match in this scope.

## Dummy data
Account: Newbert QA Dummy
Email: newbert.qa.20261009@example.com
College: Rajkiya Engineering College, Banda
Class: 2028
The dummy account was created and onboarding completed on the live site. No application code was changed.

## Executed results
| Test | Result |
|---|---|
| Empty registration | Pass: required field blocked submission |
| Invalid email | Pass: browser rejected not-an-email |
| Short password | Pass: server rejected short |
| Whitespace name | Pass: server rejected |
| Valid registration | Pass: account created and redirected to /join |
| Rajkiya search | Pass: all eight supported campuses listed |
| Individual city searches | Pass: Ambedkar Nagar, Azamgarh, Banda, Bijnor, Kannauj, Mainpuri, Mirzapur, Sonbhadra |
| REC Banda alias | Pass: Banda suggestion returned |
| Keyboard selection | Pass: ArrowDown + Enter selected Sonbhadra |
| Replace selected campus | Pass: changing search cleared verification; selecting Banda restored it |
| Missing year | Pass: Continue disabled |
| Valid year and verified college | Pass: save completed and Today dashboard opened |
| Refresh persistence | Pass: session, Banda and 2028 remained after reload |
| Saved profile | Pass: full dummy name, Banda and 2028 displayed |

Existing collegeAutocomplete automated suite: 6 passed, 0 failed. This suite mocks database search and supplements live UI checks; it is not evidence of live database behavior by itself.

## Finding for discussion
No blocking signup/onboarding bug reproduced within the supported college scope.
Adjacent profile issue: the newly created account, with no recorded projects, skills or connected coding accounts, displays “You are 82% similar to Anant's pre-placement profile.” This may overstate confidence for an incomplete profile. The same page says to complete the profile for personalized recommendations. Observed live; scoring cause and intended policy are not yet verified.

## Reusable regression preparation
Use a fresh QA account with an example.com email, class 2028, and one supported campus. Repeat city searches for all eight campuses, REC alias search, keyboard selection, change-selection invalidation, missing-year blocking, successful save, reload and saved-profile verification. Do not create outside-dataset records or submit college-add requests for this scope. Do not use real Google credentials.

Remaining tests: duplicate registration, login/logout, long-name boundaries, responsive layouts, error recovery and graduate/senior onboarding routing. These were not covered in this pass.

## Alumni story flow test — 9 October 2026

Live UI checks on the dummy account:

- Eligibility is enforced by the flow: the existing student account can open the alumni assistant, but the review/publish screen requires alumni-specific answers and later rejects incomplete publication.
- The interview is one question at a time, saves immediately, can be resumed, and permits skipping an optional question. The LinkedIn/portfolio question explicitly says “Optional”; Skip for now advanced to the next question and review recorded “Skipped — optional.”
- The platform question offers GitHub and LeetCode plus other platforms and also supports Skip for now. No real profile was connected.
- Review clearly states that publishing is approval to share on Newbert Alumni Network. It lists unanswered fields, provides Edit controls, and requires a “I reviewed my story and privacy settings” checkbox before Publish Alumni Story can enable.
- The review preview exposes Public vs College visibility. A source-by-source background summary and resume upload were not exposed in this existing draft because the saved session already contained one answer; backend intake tests cover those paths.

Focused automated checks: alumni intake/story tests passed 26 of 29. The 3 failures were HTTP harness tests with `fetch failed` before assertions, indicating a local test-server/harness startup problem rather than a product assertion failure. The intake tests specifically pass optional links/resume, missing providers remain non-blocking, wrong-host links are rejected, corrected background is retained, AI suggestions require confirmation, and privacy/publication rules are enforced.

Screenshot: rajkiya-onboarding-result.png
