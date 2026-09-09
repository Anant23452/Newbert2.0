# Today workspace

Today still uses the existing authenticated `/profiles/today` API for saved plan tasks, task counts, applications, deadlines, and the most recent unfinished notes unit. It does not make AI or external provider calls.

## Interactive focus

`TodayFocus.jsx` lets students select one of their pending tasks. It displays the actual task title, description, skill, and estimated effort. The 15/25/45-minute focus timer is local to the current task and page visit; changing tasks, leaving, or reloading resets it. Start, pause, resume, and reset use a wall-clock deadline so background tab throttling does not slow the timer.

Completing the timer does not complete the task. The student must explicitly choose Mark complete, which uses the existing authenticated improvement-plan endpoint. Timer time never affects verified coding activity or leaderboard points.

## Activity week

`TodayMomentum.jsx` reads the owner's already-synced activity calendar. `todayActivity.js` builds seven dates using Asia/Kolkata, including month/year boundaries. Each day is selectable and shows stored GitHub commits and LeetCode accepted problem counts. Accepted does not mean a first-time solve. The week count measures days with these recorded activities, not a new streak calculation or placement probability.

Missing records are described as no recorded activity. Missing accounts are labeled Not connected. Last sync is visible because this is cached data, not live provider polling. No sample users or fabricated activity were added to production.

## Navigation and appearance

Alumni is absent from Explore, the primary/mobile navbar, and Today shortcuts. Its routes, implementation, and links elsewhere are preserved. The request said not to put it on the front; it was not promoted to a primary link.

Styles are isolated in `today.css`, with day/night colors, responsive layout, visible keyboard focus, semantic pressed states, and reduced-motion support. Existing Newbert functionality and backend contracts are unchanged.

## Checks

Run `node --test src/utils/todayActivity.test.js` in the frontend for timezone, normalization, and missing-data tests. Run `npm run build` for production validation. Browser checks cover focus controls, timer expiry without task completion, day selection and real-shaped fixture counts, task saving, empty states, and mobile/day/night layouts. Browser fixtures are test-only and do not prove live provider availability.
