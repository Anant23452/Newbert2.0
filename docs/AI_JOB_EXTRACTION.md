# Newbert AI Job Extraction

This guide explains AI-02: how an administrator pastes a job description, how Newbert extracts facts, how the administrator reviews them, and what is finally stored in MongoDB.

## 1. What this feature does

The feature turns unstructured job text into a structured **draft**. It does not publish automatically.

```txt
Admin pastes raw JD + optional source URL
        -> backend asks Gemini for strict JSON
        -> backend validates every returned field
        -> deterministic parser fills only facts it can prove
        -> admin reviews and edits all fields
        -> backend stores reviewed data and overrides
        -> verification remains a separate admin decision
```

The existing Jobs Portal, saved jobs, matching engine, authentication, routes, and public job UI continue using the same `Job` records.

## 2. Main files

- `newbert-frontend/src/pages/AdminJobs.jsx`: paste dialog, extraction preview, complete editable review form, refresh status, and extraction audit.
- `newbert-frontend/src/Services/jobService.js`: calls the Admin Jobs API.
- `newbert-backend/Controllers/jobController.js`: validates admin input, creates/updates jobs, refreshes analysis, and keeps verification independent.
- `newbert-backend/services/jobJdAnalysisService.js`: deterministic extraction, AI response validation, normalization, confidence, evidence, and admin override merge.
- `newbert-backend/services/ai/prompts.js`: strict Gemini JSON prompt.
- `newbert-backend/services/ai/geminiClient.js`: shared Gemini API client and timeout behavior.
- `newbert-backend/Models/Job.js`: MongoDB schema for the reviewed job and `jdAnalysis` audit data.
- `newbert-backend/tests/jobExtractionService.test.js`: extraction and fallback tests.

## 3. Admin workflow

1. Open `/admin/jobs` with an authorized admin account.
2. Select **Paste with AI**.
3. Paste the original job text. Add the source URL when known.
4. Select **Analyze job**.
5. Inspect the summary. Missing fields display as not provided.
6. Select **Review all fields**.
7. Correct every field that needs human judgment.
8. Add the official application URL if extraction did not find it.
9. Publish the reviewed job.
10. Set or change verification separately through the existing status control.

Gemini never publishes a job and never sets an admin verification status.

## 4. Structured data extracted

The draft supports:

- Company, role, department, and role category
- Employment type and work mode
- Primary and multiple locations
- Experience level and year range
- Salary or stipend, currency, range, period, PPO, bonus, and equity
- Posted date, deadline, joining date, and internship duration
- Degrees, branches, graduation years, CGPA, backlog policy, work authorization, and other restrictions
- Critical, required, preferred, and optional skills
- CS fundamentals
- Responsibilities, qualifications, project expectations, selection process, and benefits
- Company description and application instructions
- Official apply URL, source URL, source provider, and source metadata

Absent facts remain `null`, `unknown`, or `[]`. They are not replaced with typical industry values.

## 5. Prompt safety rules

The prompt in `services/ai/prompts.js` tells Gemini to:

- return JSON only;
- extract only facts explicitly present in the pasted text;
- never infer or guess missing values;
- use fixed enum values;
- keep geography separate from work mode and page metadata;
- preserve required/preferred/optional wording;
- attach an exact source excerpt to every important field;
- never decide verification, eligibility, readiness, hiring probability, or placement probability.

Prompt instructions reduce bad output, but they are not the security boundary. Server validation is the security boundary.

## 6. Validation and evidence

`normalizeStructuredAnalysis()` parses Gemini output into Newbert's schema. Important AI fields must have `fieldEvidence` whose `evidenceText` appears in the raw JD. Requirements also store their own exact evidence excerpt.

If evidence is missing or invalid:

- the field is discarded or becomes unknown;
- a requirement becomes low confidence and is excluded from scoring;
- Newbert does not quietly accept the model's claim.

The raw JD is hashed with SHA-256 in `metadata.rawJdHash`. This helps identify which source text produced an analysis without placing the entire raw text in the hash itself.

## 7. Deterministic fallback

If `GEMINI_API_KEY` is missing, Gemini times out, the request fails, or the model returns invalid JSON, Newbert still creates a deterministic draft from explicit text patterns.

The UI says that AI analysis could not be completed and offers retry or manual completion. It does not pretend the fallback came from Gemini.

The fallback currently recognizes reliable signals such as URLs, known skills, required/preferred wording, remote/hybrid/onsite work, dates, CGPA, graduation years, degrees, branches, compensation, and internship duration. It intentionally returns less data when uncertain.

## 8. Admin overrides

The frontend remembers the extracted form snapshot. When an administrator changes a field, the changed value is sent in `manualOverrides`.

On save:

- reviewed skill lists replace AI lists;
- reviewed eligibility values replace AI values;
- reviewed role sections replace AI sections;
- the complete normalized result is stored in `job.jdAnalysis`;
- override provenance is stored in `job.jdAnalysis.adminOverrides`;
- metadata records the review time and extraction method.

This makes the administrator authoritative without losing the original extraction audit.

## 9. Refresh behavior

**Refresh AI** re-runs extraction from `source.rawText` when available. It preserves:

- admin-reviewed requirements;
- eligibility overrides;
- section overrides;
- `adminOverrides` metadata;
- the existing verification object and status.

Refresh does not verify or unverify the job. Verification and AI extraction are deliberately independent.

## 10. Verification is separate

`jobVerificationService.js` continues to calculate a preview for a new job and supports the existing admin verification workflow. AI output cannot mark a job verified.

An official URL is still required before publishing. Admin authorization is still enforced by the existing backend middleware. The frontend route is not treated as a security mechanism.

## 11. MongoDB fields

Reviewed values are stored both where existing Newbert code expects them and in structured form:

- top-level fields such as `title`, `company`, `location`, `compensation`, and `requirements` support the current product;
- `jdAnalysis` keeps normalized requirements, eligibility, field evidence, confidence, extraction metadata, hash, and overrides;
- `source.rawText` keeps the original extraction source for later refresh;
- `verification` remains independent.

This backward-compatible shape lets existing matching and Jobs Portal code continue working.

## 12. Connecting Gemini

Set the backend environment variable:

```env
GEMINI_API_KEY=your_server_side_key
```

Never put this key in a `VITE_` variable or frontend code. Restart the backend after changing environment variables. The frontend calls Newbert's backend; only the backend calls Gemini.

To replace Gemini later, keep the same strict JSON contract and change the shared AI client. The validator and admin review flow should remain in place regardless of model vendor.

## 13. API contract

Analyze a raw post:

```http
POST /api/admin/jobs/analyze-raw
Authorization: Bearer <admin JWT>
Content-Type: application/json

{
  "rawText": "complete pasted job description",
  "sourceUrl": "https://company.example/careers/job"
}
```

The response contains a draft only. Publishing uses the existing `POST /api/admin/jobs` route. Updating uses `PATCH /api/admin/jobs/:id`. Refresh uses `POST /api/admin/jobs/:id/refresh`.

Do not send trusted totals, verification decisions, or model-produced readiness scores from the frontend. The backend validates and calculates trusted values.

## 14. Local testing

Backend tests:

```bash
cd newbert-backend
npm test
```

Frontend checks:

```bash
cd newbert-frontend
npm run lint
npm run build
```

Manual admin test:

1. Sign in with an account whose email is allowed by the existing admin configuration.
2. Paste a JD containing salary, CGPA, remote work, required Python, and preferred Docker.
3. Confirm those values appear and an unmentioned skill such as Java does not.
4. Change minimum CGPA and replace one skill in the review form.
5. Publish, edit, and refresh the job.
6. Confirm the changed fields and verification status remain unchanged after refresh.
7. Open the Jobs Portal and confirm the job still renders and matching still works.

For a second non-admin account, confirm `/admin/jobs` returns access denied while the verified public job remains visible through the normal Jobs Portal.

## 15. Production checklist

- Configure `GEMINI_API_KEY` only on the backend host.
- Configure the existing admin email/role settings.
- Keep frontend API calls pointed at the Render backend through `VITE_API_URL`.
- Deploy backend schema/service/controller changes before relying on new frontend fields.
- Run tests and the frontend build before deployment.
- Test one AI success, one forced AI failure, one manual override, and one refresh with a previously verified job.

AI-02 extracts and organizes job facts. It does not replace admin review, source verification, or deterministic job matching.
