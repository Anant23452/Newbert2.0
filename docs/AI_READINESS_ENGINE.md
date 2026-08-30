# AI-01: Truthful Current Situation and Gap Analysis

## Purpose

AI-01 measures how much of a **Newbert curated readiness benchmark** is represented by the evidence currently available in a student's profile. It does not predict placement, hiring, interviews, salary, or employer decisions.

The request flow is:

```txt
Existing Profile document
  -> read-only normalization
  -> supported role benchmark lookup
  -> deterministic category coverage
  -> deterministic gaps and top priorities
  -> optional Gemini explanation
  -> deterministic explanation fallback
  -> existing Profile page
```

## Existing Profile Features Reused

AI-01 reuses the existing authenticated Profile, including:

- college, canonical college ID, branch, graduation year, and CGPA;
- target role;
- saved and integration-derived skills;
- recorded project count;
- GitHub profile statistics and contribution activity;
- LeetCode solved totals, difficulty totals, and recent activity;
- the combined GitHub/LeetCode activity calendar;
- the existing sync timestamp and connection state.

The profile header, edit/completion flow, privacy controls, connected-account cards, senior match, peer benchmark, streak calendar, skill display, job tracker, public profile, and leaderboard behavior were not replaced.

## Files

### Added

- `newbert-backend/config/readinessBenchmarks.js`
- `newbert-backend/services/studentProfileNormalizationService.js`
- `newbert-backend/services/readinessExplanationService.js`
- `newbert-backend/Controllers/intelligenceController.js`
- `newbert-backend/routes/intelligenceRoutes.js`
- `newbert-backend/tests/readinessService.test.js`
- `newbert-frontend/src/Components/Profile/ReadinessAnalysis.jsx`
- `docs/AI_READINESS_ENGINE.md`

### Extended

- `newbert-backend/services/readinessService.js`
- `newbert-backend/services/ai/prompts.js`
- `newbert-backend/server.js`
- `newbert-backend/package.json`
- `newbert-frontend/src/pages/Profile.jsx`
- `newbert-frontend/src/data/profileOptions.js`

## Database Impact

There is no schema change and no migration. AI-01 reads the existing `Profile` document and creates a normalized object in memory. This keeps the existing Profile collection as the source of truth.

## Authenticated API

```http
GET /api/intelligence/readiness
Authorization: Bearer <JWT>
```

The endpoint only reads the authenticated user's Profile. It does not expose email, JWT data, private links, or another user's readiness analysis.

## Normalized Profile

`studentProfileNormalizationService.js` converts the existing document into explicit sections:

```js
{
  academics: { college, collegeId, branch, graduationYear, cgpa },
  goals: { targetRole },
  dsa: {
    available,
    totalSolved,
    easy,
    medium,
    hard,
    topicDataAvailable: false,
    topics: [],
    recentActivity
  },
  development: { skills },
  projects: { available, count, evidenceLevel },
  github: { available, publicRepos, languages, contributionsLast30 },
  activity: { available, activeDaysLast30, timezone: "Asia/Kolkata" },
  dataSources
}
```

Missing information stays `null`, `[]`, or `available: false`. It is never invented.

### Skill Evidence

Saved skills are represented with an evidence source:

```js
{
  name: "React",
  evidence: [{ source: "self_reported", supported: false }]
}
```

An existing skill whose source is `github` or `leetcode` is marked as supported by that integration. This does not mean GitHub proves general mastery. The current GitHub sync only derives programming-language evidence from public repository metadata. It does not verify framework usage from repository files.

## Supported Targets

AI-01 supports:

- Software Engineer
- Frontend Developer
- Backend Developer
- Full Stack Developer

The earlier `Software Development` value maps to Software Engineer for backward compatibility. Other existing Profile goals remain selectable, but AI-01 returns `supported: false` and does not calculate a hidden software score for them.

## Curated Benchmarks

Role definitions live in `config/readinessBenchmarks.js`, separate from calculation code. Each benchmark contains:

- core skill categories and aliases;
- recommended skills for documentation/context;
- CS fundamentals;
- a DSA total-solved reference;
- a recorded-project-count reference;
- a 30-day activity reference.

These are Newbert product benchmarks, not universal employer requirements.

## Exact Coverage Calculation

All displayed values are integer percentages to avoid unsupported decimal precision.

### Skill Coverage

```txt
matched core skill categories / total core skill categories * 100
```

A category is matched when at least one of its configured aliases appears in current skill evidence. If no skill evidence exists, Skill Coverage is unavailable, not zero.

### DSA Coverage

```txt
min(100, LeetCode total solved / role DSA reference * 100)
```

Role references:

- Software Engineer: 250
- Frontend Developer: 150
- Backend Developer: 200
- Full Stack Developer: 200

If LeetCode is unavailable, DSA Coverage is unavailable and excluded from overall coverage.

### Project Coverage

```txt
min(100, recorded project count / role project-count reference * 100)
```

This measures recorded count only. It does not verify project quality, complexity, testing, deployment, ownership, or impact.

### CS Fundamentals Coverage

```txt
represented fundamental categories / configured fundamental categories * 100
```

The initial fundamentals are OOP, DBMS, Operating Systems, and Computer Networks. If no skill evidence exists, this category is unavailable.

### Activity Coverage

```txt
min(100, synced active days in the last 30 days / 12 * 100)
```

An active day requires at least one recorded GitHub contribution or LeetCode submission. Dates use `Asia/Kolkata`. This is a consistency signal, not a personality judgment.

### Overall Coverage

Configured weights:

```txt
Skills          35
DSA             25
Projects        20
Fundamentals    10
Activity        10
```

The calculation uses only available categories:

```txt
sum(category coverage * category weight)
-------------------------------------------------
sum(weights for available categories)
```

Overall Coverage is available only when:

1. a supported target role exists;
2. at least two categories are available; and
3. at least one primary category (Skills, DSA, or Projects) is available.

An unavailable category contributes neither zero nor weight.

## Exact Data Confidence Calculation

Six source groups are checked:

1. supported target role;
2. academic profile (college and branch);
3. skill profile;
4. synced LeetCode data;
5. synced GitHub data;
6. recorded project count.

```txt
High    = all 6 sources available
Medium  = 3 to 5 sources available
Low     = 0 to 2 sources available
```

Confidence describes information completeness. It does not describe placement probability or student ability.

## Gap Detection

Gaps are generated only from available deterministic evidence:

- an unmatched configured core skill category;
- an unmatched configured CS fundamental;
- available DSA coverage below 80%;
- available project coverage below 100%;
- available activity coverage below 80%.

The wording says evidence is not represented. It does not claim that the student definitely lacks the skill.

Every gap has:

```js
{
  category,
  item,
  severity,
  evidence,
  reason,
  recommendedAction
}
```

## Exact Priority Calculation

Severity is deterministic:

```txt
High-priority benchmark item below 60% -> high
Any category below 50%                -> high
Category below 80%                    -> medium
Otherwise                             -> low
```

Gaps are sorted by:

1. severity (`high`, then `medium`, then `low`);
2. largest percentage deficit;
3. item name for a stable tie-break.

Only the first three become Top Priorities. Gemini cannot reorder them.

## LeetCode Limitations

The current integration reliably provides:

- total solved;
- easy, medium, and hard solved counts;
- a limited recent accepted-submission feed;
- submission calendar activity.

It does not provide reliable topic mastery. AI-01 always returns:

```js
topicDataAvailable: false
```

It never generates claims such as "Dynamic Programming is weak" or "Trees are strong". The recent accepted feed is limited and is not treated as complete newly-solved history.

## GitHub Limitations

The current integration reliably provides public repository totals, primary repository languages, and contribution-calendar data when `GITHUB_TOKEN` is configured. Public repository count is not scored as engineering ability. Framework mastery, testing quality, architecture, and code quality are not verified by this milestone.

## Gemini's Restricted Role

Gemini receives the completed deterministic response and returns only:

```json
{
  "summary": "",
  "nextActionExplanation": ""
}
```

The prompt instructs Gemini to:

- use only supplied facts;
- never change or calculate scores;
- never invent skills, projects, topics, gaps, or priorities;
- never create placement probability;
- treat unavailable data as unknown;
- never promise an interview, placement, or offer.

The backend rejects malformed output, unsafe hiring claims, and percentages not present in the deterministic analysis.

## Gemini Fallback

If the API key is absent, the provider times out, rate limits, returns invalid JSON, makes an unsafe claim, or fails for any other reason, `readinessExplanationService.js` returns deterministic text. Coverage, gaps, confidence, and priorities remain available because they never depend on Gemini.

## Frontend Integration

The Profile page fetches AI-01 after its existing profile data loads. The new block appears after the existing senior/activity and peer benchmark content. It includes:

- Readiness Coverage or an insufficient-data message;
- target role and Data Confidence;
- available and unavailable category states;
- `Why am I seeing this?` details;
- structured Gap Analysis;
- maximum three Top Priorities;
- compact Gemini or deterministic fallback explanation.

No separate GitHub, LeetCode, streak, senior, or privacy UI was added.

## Testing

Run:

```bash
cd newbert-backend
npm test
```

The tests cover a rich profile, missing GitHub, missing LeetCode, missing projects, missing target, unsupported target, Gemini failure, and an almost-empty new profile.

## Viva Explanation

The simplest accurate explanation is:

> Newbert first normalizes real saved profile evidence. A deterministic engine compares only available categories with a maintained role benchmark. Missing data is excluded instead of scored as zero. The engine calculates confidence, gaps, and priorities. Gemini receives that finished result only to explain it, and a deterministic fallback keeps the feature working when AI is unavailable.

