# Newbert Evidence Engine

## Philosophy

Newbert does not claim what a student knows. It shows what available evidence supports, how strong that evidence is, what a target job asks for, and which action can produce stronger evidence. Scores are estimates, never placement guarantees.

## Architecture

```text
GitHub -----+
LeetCode ---+
Projects ---+--> Evidence Engine --> Skill Profile
Profile ----+

Job Description --> Requirement Engine --> Evidence Comparison
                                              |
                                              v
                                        Gap Analysis
                                              |
                                              v
                                         Action Tasks
                                              |
                                              v
                                      LLM Explanation
```

The LLM is an optional final explanation layer. It cannot add evidence, modify deterministic scores, or turn missing data into a positive or negative claim.

## Evidence Sources And Levels

- `claimed`: student-entered skill with no independent implementation signal.
- `detected`: dependency, manifest, language, or relevant file evidence.
- `used`: implementation patterns occur in several relevant source files.
- `demonstrated`: multiple meaningful signals or a deployed structured project.
- `strong_evidence`: sustained evidence across multiple meaningful sources. Newbert never uses `mastered` automatically.

Each skill retains source, type, repository/project, human-readable evidence, and weight.

## Project Scoring

Structured projects are scored from repository, deployment, README, frontend, backend, database, authentication, API integration, feature depth, and technology breadth. The result is clamped to 0-100. Old numeric project counts remain valid but are labelled `count_only` and do not receive an invented quality score. Bounded GitHub scans can derive project structure automatically.

## GitHub Analysis

GitHub sync inspects at most five recent non-fork repositories, twenty relevant files per repository, and 100 KB per file. It ignores dependencies, generated output, vendor directories, locks, builds, and coverage. A dependency is weak detection evidence; implementation patterns are required for usage levels. Repository inspection runs only during profile sync, not page rendering.

## LeetCode Topics

Overall solved totals always remain separate from topics. Topic evidence is produced only from real tagged recent accepted problems or IDs contained in the maintained tracked-problem map. The public recent feed is incomplete, so its results are labelled `limited_recent_accepted_feed`. If neither mode is available, the API returns `topicEvidenceAvailable: false` and an empty topic object.

## Requirement Provenance

- `explicit`: directly supported by JD text.
- `inferred`: strongly implied by a stated framework or responsibility.
- `role_baseline`: common role foundation, clearly not company-mandated.
- `manual`: entered or verified by an administrator.

Legacy requirement strings normalize to `manual` with conservative confidence. Role baselines supplement JDs with fewer than three supported technical requirements and are excluded from company requirement-coverage percentages.

## Gaps And Tasks

The gap engine compares the confidence-adjusted requirement weight with the student's evidence score. Severity is high at 50+, medium at 25+, low above 5, and none otherwise. It produces three task categories: `critical`, `recommended`, and `role_baseline`. Tasks are deterministically sorted and limited to the seven highest-impact actions.

## Readiness And Confidence

Readiness combines only available DSA, project, skill, and activity dimensions, weighted by evidence confidence. Missing dimensions reduce confidence instead of becoming zero. Responses include numeric confidence, a Low/Medium/High label, sources, limitations, and a placement-guarantee disclaimer.

## Caching And Failure Handling

GitHub and LeetCode data are persisted on `Profile`; normalized cache metadata records update time and staleness. Sync is manually triggered and rate-limited. When an external request fails for the same connected identity, Newbert keeps the last successful evidence and marks it stale. It never replaces cached evidence with zero because a provider is temporarily unavailable.

## Limitations

- GitHub source patterns support evidence of usage, not expertise or code quality.
- LeetCode does not provide a reliable complete public solved-topic history; recent or tracked coverage is explicitly scoped.
- Private repositories and private LeetCode activity are unavailable without additional authorized integrations.
- Readiness is a decision-support estimate, not a hiring prediction or guarantee.
