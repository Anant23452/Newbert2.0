# Newbert AI-02: JD Intelligence and Truthful Job Matching

## 1. What this system means

Newbert's percentage is **requirement coverage**. It measures how much of a job's explicit, validated requirements have evidence in the student's current Newbert profile.

It is not:

- a probability of getting hired;
- a probability of getting an interview;
- a recruiter score;
- a placement prediction.

The separation is important because a language model is useful for turning unstructured text into a proposed structure, but it must not make a hiring decision or invent a mathematical score.

## 2. Request flow

```text
Admin supplies a raw JD
        |
        v
Gemini extracts explicit facts once
        |
        v
Backend validates JSON, evidence, values, and enums
        |
        +---- AI fails ----> deterministic text fallback
        |
        v
Validated structured JD is stored on the existing Job document
        |
        v
Existing AI-01 student profile is normalized
        |
        v
Deterministic eligibility and requirement matching
        |
        v
Deterministic requirement coverage and readiness bucket
        |
        v
Optional Gemini explanation of the already-calculated result
        |
        +---- AI fails ----> deterministic explanation
```

The Jobs list does not call Gemini per student or per card. It reads saved JD analysis and runs cheap deterministic matching. The job-detail analysis endpoint may request one explanation, but Gemini cannot change the score or bucket.

## 3. Existing features preserved

AI-02 refines the existing Jobs platform. It preserves:

- the existing `Job` and `SavedJob` MongoDB collections;
- admin authentication and authorization;
- job create, edit, delete, status, filter, and verification flows;
- source verification and expiry behavior;
- saved jobs;
- official apply links;
- alumni matching;
- public and recommended Jobs APIs;
- AI-01 normalized student profile and evidence model.

No duplicate job model or second student representation was introduced.

## 4. Structured JD shape

Validated analysis is stored in the existing flexible `job.jdAnalysis` field.

```js
{
  role: "Backend Engineer",
  eligibility: {
    degrees: [],
    branches: ["CSE", "IT"],
    graduationYears: [2026],
    minimumCgpa: 7,
    locationRestrictions: [],
    other: []
  },
  requirements: [
    {
      id: "req-...",
      canonicalSkill: "nodejs",
      label: "Node.js",
      category: "technical",
      importance: "required",
      evidenceText: "Strong experience with Node.js is required.",
      confidence: "high",
      scoreEligible: true,
      source: "gemini"
    }
  ],
  experience: {},
  responsibilities: [],
  metadata: {
    extractionMethod: "gemini",
    model: "configured Gemini model",
    analyzedAt: "ISO timestamp",
    schemaVersion: "2.0"
  }
}
```

Compatibility arrays such as `requiredSkills` and `preferredSkills` remain available because older Newbert code still reads them.

## 5. Gemini's exact role

Gemini receives only the supplied JD and a strict extraction prompt. It may extract:

- role;
- explicit eligibility facts;
- explicit technical or non-technical requirements;
- importance wording;
- short supporting JD text;
- responsibilities and explicit experience facts.

It may not:

- add common skills for a role;
- invent CGPA, degree, branch, or graduation-year restrictions;
- compare the JD with a student;
- decide eligibility;
- calculate coverage;
- assign a readiness bucket;
- predict recruiter behavior.

The extraction prompt explicitly requires empty arrays or `null` for unavailable facts and exact JSON only.

## 6. Validation and provenance

Gemini output is never saved blindly. `jobJdAnalysisService` validates and normalizes it.

Checks include:

- valid object and array shapes;
- valid importance: `critical`, `required`, `preferred`, or `optional`;
- valid confidence: `high`, `medium`, or `low`;
- non-empty skill labels;
- normalized and deduplicated requirements;
- CGPA between 0 and 10;
- graduation years between 2000 and 2100;
- short evidence that actually appears in the supplied JD;
- safe known fields only.

Every score-eligible requirement needs supporting JD evidence and medium or high confidence. Unsupported or low-confidence requirements remain visible as uncertain data but are excluded from coverage.

Human-reviewed admin requirements take precedence. They are still transformed into structured requirements and marked as admin overrides.

## 7. Deterministic JD fallback

If Gemini is missing, times out, returns invalid JSON, or returns invalid structured data, the job remains usable.

The fallback:

- searches JD text for skills from the central alias directory;
- uses surrounding wording to classify preferred, optional, required, or critical;
- keeps the matching JD sentence as evidence;
- extracts conservative CGPA, degree, branch, and graduation-year facts;
- leaves facts empty when it cannot support them.

It does not add a default technology stack or CGPA.

## 8. Central skill normalization

`skillNormalizationService.js` is the single source for skill aliases and curated relationships.

Examples:

```text
Node.js / Node JS / NodeJS       -> nodejs
Postgres / PostgreSQL            -> postgresql
REST / RESTful API / REST APIs   -> rest-api
JS / JavaScript                  -> javascript
```

Controllers and matching services use this shared service instead of maintaining separate alias lists. Adding a new alias is therefore a small, reviewable configuration change.

## 9. Student evidence

The matcher consumes `normalizeStudentProfile()` from AI-01. It does not build another profile model.

The normalized input includes:

- academics and target role;
- normalized skills and their evidence source;
- LeetCode availability and totals;
- GitHub availability and recent activity;
- project availability;
- data-source confidence and sync timestamps.

Missing GitHub or LeetCode data does not erase separately saved skill evidence. Missing all student skill evidence produces `unknown`, not `missing`, for skill requirements.

## 10. Eligibility engine

Eligibility evaluates only explicit JD criteria.

Each check returns:

```js
{
  field: "minimumCgpa",
  required: 7,
  studentValue: 7.2,
  status: "passed",
  reason: "Saved CGPA meets the explicit JD minimum."
}
```

Result rules:

- any explicit failed check -> `eligible: false`;
- no failed check but at least one unknown check -> `eligible: null`;
- all explicit checks pass -> `eligible: true`;
- no explicit eligibility criteria -> no eligibility checks, so known eligibility passes.

Degree and work-authorization/location restrictions currently remain unknown because AI-01 does not store sufficiently normalized evidence for them.

## 11. Requirement statuses

Every validated requirement receives one deterministic status.

| Status | Meaning |
| --- | --- |
| `matched` | Exact normalized or alias-equivalent student skill evidence exists. |
| `partial` | A curated related skill exists, or relevant DSA activity exists without topic-level proof. |
| `missing` | Student skill evidence is available, but no direct or curated related evidence exists. |
| `unknown` | Student evidence is unavailable, or the JD requirement lacks reliable provenance. |

`unknown` is deliberately different from `missing`. Unknown requirements are not silently given zero points.

## 12. Requirement importance and weights

Weights live in `config/jobMatchingConfig.js`:

| Importance | Weight |
| --- | ---: |
| critical | 4 |
| required | 3 |
| preferred | 1 |
| optional | 0.5 |

Status credit is:

| Status | Credit |
| --- | ---: |
| matched | 1 |
| partial | 0.5 |
| missing | 0 |
| unknown | excluded |

These are Newbert V1 product settings, not universal hiring facts.

## 13. Exact coverage formula

Only reliable requirements with JD evidence and medium/high confidence are score eligible.

```text
known weight = sum(weight of matched + partial + missing requirements)

earned weight =
  sum(weight * 1.0 for matched)
  + sum(weight * 0.5 for partial)
  + sum(weight * 0.0 for missing)

coverage = round((earned weight / known weight) * 100)
```

Unknown requirements are excluded from both earned and known weight. Newbert also calculates a known-evidence ratio. Coverage is unavailable when:

- there are no reliable score-eligible requirements;
- no student evidence is known for them; or
- less than 50% of reliable JD requirement weight has a known student status.

Separate coverage values are calculated for:

- overall requirements;
- core requirements (`critical` + `required`);
- preference requirements (`preferred` + `optional`).

Values are rounded to whole percentages.

## 14. Exact readiness buckets

Thresholds live in `config/jobMatchingConfig.js`.

```text
NOT_ELIGIBLE
  At least one explicit eligibility check failed.

INSUFFICIENT_DATA
  Eligibility is unknown, or overall/core coverage is unavailable.

APPLY_NOW
  Eligibility passes,
  no critical requirement is anything other than matched,
  overall coverage >= 80%,
  core coverage >= 80%.

WITHIN_REACH
  Eligibility passes,
  no critical requirement is missing,
  overall coverage >= 50%,
  core coverage >= 60%,
  and APPLY_NOW did not apply.

NOT_READY
  Eligibility passes but the role does not meet the configured conditions above.
```

`Apply Now` means the current evidence passes Newbert's explicit eligibility and core coverage settings. It never guarantees an interview or offer.

## 15. Learning distance

`within_reach` matches receive a deterministic label:

- 0-1 core gaps: small gap;
- 2-3 core gaps: moderate gap;
- more than 3 core gaps: significant gap.

The action list refers only to actual partial or missing core requirements. It never promises an exact learning time.

## 16. Gemini explanation

After all deterministic work is complete, the details endpoint can send these facts to Gemini:

- locked bucket and bucket reason;
- eligibility checks;
- coverage objects;
- matched, partial, missing, and unknown requirements.

The returned JSON is validated again. Unsupported percentages, unknown skill names, probability language, guarantees, and hiring promises are rejected. When rejected or unavailable, `jobMatchExplanationService` returns a deterministic explanation.

## 17. Example

Raw JD:

```text
Backend Engineer. Strong Node.js and REST API experience required.
Experience with Docker is preferred. Minimum CGPA 7.0.
```

Validated extraction (shortened):

```json
{
  "eligibility": { "minimumCgpa": 7 },
  "requirements": [
    { "canonicalSkill": "nodejs", "importance": "required", "evidenceText": "Strong Node.js and REST API experience required.", "confidence": "high" },
    { "canonicalSkill": "rest-api", "importance": "required", "evidenceText": "Strong Node.js and REST API experience required.", "confidence": "high" },
    { "canonicalSkill": "docker", "importance": "preferred", "evidenceText": "Experience with Docker is preferred.", "confidence": "high" }
  ]
}
```

Student has CGPA 8.1, Node.js, and Express. Express is a curated partial relation to REST APIs; Docker is missing.

```text
Node.js: matched -> 3 * 1.0 = 3
REST API: partial -> 3 * 0.5 = 1.5
Docker: missing -> 1 * 0 = 0
earned = 4.5
known = 7
overall coverage = round(4.5 / 7 * 100) = 64%
core coverage = round(4.5 / 6 * 100) = 75%
bucket = WITHIN_REACH
```

Example response fragment:

```json
{
  "match": {
    "eligible": true,
    "bucket": "within_reach",
    "coverage": {
      "overall": { "status": "available", "value": 64 },
      "required": { "status": "available", "value": 75 },
      "matchedCount": 1,
      "partialCount": 1,
      "missingCount": 1,
      "unknownCount": 0
    }
  },
  "explanation": {
    "source": "gemini",
    "summary": "...",
    "nextStep": "..."
  }
}
```

## 18. Cache and refresh behavior

- Create: analyze the JD once, validate it, save it, then verify the job.
- Edit without JD/title change: preserve saved structured analysis and merge reviewed overrides.
- Edit with material JD/title change: re-analyze, validate, save, and re-verify.
- Admin refresh: re-analyze the saved JD and re-run verification.
- Jobs list: no Gemini call; deterministic match only.
- Job details: deterministic match plus one optional explanation request.

## 19. Security and trust boundaries

- Gemini credentials remain backend-only.
- Admin routes retain existing auth and admin middleware.
- Job fields, URLs, dates, location, salary, and requirement values are sanitized server-side.
- Coverage, eligibility, and buckets are calculated on the backend.
- The frontend cannot submit a score or decide a bucket.
- Verification status is separate from student coverage.

## 20. Current limitations

- Manual skills remain self-reported evidence unless backed by an integration.
- The current GitHub integration does not prove that a specific technology was used competently in a project.
- Current projects are count-only in AI-01, so AI-02 does not infer requirement matches from project titles or descriptions.
- LeetCode proves activity totals, not complete DSA topic coverage.
- Degree and work authorization are not normalized enough for automatic pass/fail checks.
- Curated related skills are intentionally conservative and need human review as the alias directory grows.
- Deterministic fallback extraction covers known aliases and common eligibility patterns, not every possible JD phrase.
- Existing legacy jobs can be matched through a compatibility conversion, but an admin refresh produces better provenance.

## 21. Files created

- `newbert-backend/config/jobMatchingConfig.js`
- `newbert-backend/services/skillNormalizationService.js`
- `newbert-backend/services/jobMatchExplanationService.js`
- `newbert-backend/tests/jobMatchingService.test.js`
- `docs/AI_JOB_MATCHING_ENGINE.md`

## 22. Files refined

- `newbert-backend/Controllers/jobController.js`
- `newbert-backend/services/ai/prompts.js`
- `newbert-backend/services/jobJdAnalysisService.js`
- `newbert-backend/services/jobMatchingService.js`
- `newbert-backend/services/studentProfileNormalizationService.js`
- `newbert-backend/services/readinessService.js`
- `newbert-backend/services/alumniMatchingService.js`
- `newbert-backend/services/seniorMatchService.js`
- `newbert-frontend/src/pages/Jobs.jsx`
- `newbert-frontend/src/pages/AdminJobs.jsx`

The four non-job services above now consume the same central skill normalization behavior, avoiding conflicting aliases across Newbert.

## 23. How to explain AI-02 in one minute

"Newbert uses Gemini as a constrained parser, not as a hiring judge. The backend validates every extracted requirement against the real JD and stores the result once. A deterministic service then compares that structure with Newbert's existing normalized student evidence. Unknown data stays unknown, eligibility is checked only against explicit JD rules, and an explainable weighted formula produces requirement coverage. Fixed rules assign a recommendation bucket. Gemini may finally rewrite those locked facts into a friendly explanation, but it cannot change the math or predict hiring."
