# AI-03: Personalized Roadmap and Next Best Action Engine

## 1. Product purpose

AI-03 finds the shortest defensible path between what Newbert can currently prove about a student and a selected role or saved job.

It is not a generic Gemini study-plan generator. The roadmap is calculated by backend rules from AI-01 and AI-02 data. Gemini may explain the saved result but cannot create skills, reorder tasks, or change scores.

## 2. Architecture

```txt
MongoDB Profile
      |
      v
AI-01 normalizeStudentProfile + calculateProfileReadiness
      |
      +-------------------------------+
                                      |
Saved target Job(s)                   |
      |                               |
      v                               v
AI-02 analyzeJobMatch          Role benchmark gaps
      |                               |
      +---------------+---------------+
                      v
        roadmapPriorityService
                      |
                      v
        roadmapBuilderService
                      |
                      v
        nextBestActionService
                      |
                      v
             MongoDB Plan
                      |
          +-----------+-----------+
          |                       |
          v                       v
 Existing Roadmap UI       Gemini explanation
                           with deterministic fallback
```

No duplicate profile, readiness engine, or job matcher was introduced.

## 3. Inputs

### AI-01 current state

The engine reuses:

- normalized skills and their evidence sources;
- academics;
- GitHub availability and activity;
- LeetCode totals and activity limitations;
- project count and its evidence limitation;
- role-specific readiness gaps;
- gap severity;
- data confidence.

Example:

```json
{
  "goals": { "targetRole": "Machine Learning Engineer" },
  "development": {
    "skills": [
      { "name": "Python", "normalizedName": "python" },
      { "name": "Pandas", "normalizedName": "pandas" },
      { "name": "NumPy", "normalizedName": "numpy" }
    ]
  },
  "projects": { "available": true, "count": 1, "evidenceLevel": "count_only" },
  "dataConfidence": { "level": "medium" }
}
```

### AI-02 target job

For Job Roadmaps, the selected job must be saved by the logged-in student. Newbert reuses the AI-02 structured requirements and deterministic match.

```json
{
  "job": {
    "company": "AetherMind Labs",
    "title": "Machine Learning Engineer Intern",
    "requirements": [
      { "skill": "Python", "importance": "required" },
      { "skill": "scikit-learn", "importance": "required" },
      { "skill": "Cross-validation", "importance": "required" },
      { "skill": "Docker", "importance": "preferred" }
    ]
  },
  "match": {
    "matched": ["Python"],
    "missing": ["scikit-learn", "Cross-validation", "Docker"]
  }
}
```

Up to five saved jobs can be selected. The backend confirms ownership and excludes inactive, rejected, or expired jobs.

## 4. Role and Job Roadmaps

**Role Roadmap** uses the selected role's AI-01 benchmark gaps.

**Job Roadmap** combines role gaps with one or more selected saved jobs. Required skills shared by multiple jobs receive an additional deterministic weight.

When there is no target, the API returns:

```txt
Choose a target role or target job to build a personalized roadmap.
```

The code never silently substitutes Software Developer.

## 5. Exact priority formula

Weights live in `newbert-backend/config/roadmapPriorityConfig.js`.

```txt
Core selected-role requirement            +4
Required in a selected target job         +4
High-severity AI-01 gap                   +3
Important prerequisite                    +2
Weak or no current evidence               +2
Required across at least two target jobs  +2
Preferred-only target-job requirement     +1
```

Each reason is applied at most once per gap except that job frequency is stored separately for explanation.

Priority labels:

```txt
High    score >= 6
Medium  score >= 3
Low     score < 3
```

These values are Newbert product weights, not hiring rules or placement probabilities.

Example:

```json
{
  "item": "Cross-validation",
  "category": "core-skills",
  "priorityScore": 12,
  "priority": "high",
  "reasons": [
    "Core requirement in Newbert's selected-role benchmark",
    "Required by a selected target job",
    "No strong current evidence supports this area",
    "Required across multiple selected jobs"
  ]
}
```

## 6. Next Best Action formula

The engine selects one open task using this exact order:

1. Exclude completed, skipped, and archived tasks.
2. Sort by `priorityScore` descending.
3. For equal scores, prefer a task already marked `in_progress`.
4. For any remaining tie, sort by task title for stable deterministic output.
5. Return the first task.

It never calculates a probability increase.

```json
{
  "action": "Learn and apply Cross-validation in an existing project",
  "priority": "high",
  "priorityScore": 12,
  "why": [
    "Required by a selected target job",
    "No strong current evidence supports this area"
  ]
}
```

## 7. Roadmap phases

Only phases that contain current tasks are saved:

- Foundations
- Core Skills
- DSA / Interview Preparation
- Project / Engineering Evidence
- Application Readiness

Tasks are not added merely to make every phase visible.

## 8. Do not reteach known skills

AI-01 only emits a role gap when current evidence does not satisfy the benchmark. AI-02 matched requirements are skipped. Areas explicitly marked completed in the existing current-stage flow are also filtered out.

Therefore, a student with Python, Pandas, and NumPy is not given beginner Python, Pandas, or NumPy tasks.

## 9. Project upgrade behavior

The current Profile stores a project count, not a detailed project feature graph. Newbert cannot claim that a project contains authentication, testing, Docker, or CI/CD.

When at least one project is recorded, a core-skill task uses honest wording such as:

```txt
Learn and apply Docker in an existing project.
```

This prefers upgrading existing work without inventing what that project already contains.

## 10. Task evidence and progress

Task states are persisted in MongoDB:

```txt
not_started
in_progress
completed
skipped
```

Each task can also contain:

- deterministic reason codes;
- readable reasons;
- AI-01 or target-job evidence;
- related gap IDs;
- related target jobs;
- priority score and label.

Legacy `completed` is retained for backward compatibility.

## 11. Refresh and history

Roadmaps are not regenerated during page load. `GET /api/plans/me` only reports `needsRecalculation` when meaningful profile or selected-job evidence changed.

**Refresh roadmap**:

1. Reloads the current Profile.
2. Reruns AI-01 normalization and readiness.
3. Reloads selected saved jobs.
4. Reruns AI-02 matching.
5. Recalculates priorities and tasks.
6. Preserves completed and skipped tasks with stable IDs.
7. Removes obsolete unstarted tasks.
8. Archives obsolete completed or skipped tasks.
9. Creates a new version only if the meaningful input signature changed.

The last ten version summaries are stored in `roadmapHistory`.

## 12. Data confidence

Confidence comes directly from AI-01. Low confidence displays:

```txt
Newbert has limited evidence about your current skills. Add project, GitHub, or LeetCode data to improve roadmap accuracy.
```

When evidence is too limited for AI-01 to name gaps responsibly, the roadmap remains short or empty instead of inventing detailed work.

## 13. Gemini's restricted role

The backend sends Gemini only the already calculated roadmap facts. Gemini may provide:

- a concise summary;
- an explanation of the server-selected Next Best Action;
- descriptions for existing phase IDs.

Gemini cannot:

- add skills or tasks;
- alter ordering or scores;
- add target-job requirements;
- invent achievements or timelines;
- claim interview, offer, or placement probability.

The response must match a JSON contract. Unknown phase IDs, unsupported percentages, invalid JSON, and guarantee language are rejected.

## 14. Fallback

If Gemini is unavailable or invalid, `roadmapExplanationService` returns a deterministic explanation using the saved target, data confidence, Next Best Action, supplied reasons, and existing phase titles. The roadmap itself never depends on Gemini.

## 15. Example generated roadmap

```json
{
  "version": 2,
  "analysisVersion": "AI-03.1",
  "targetSnapshot": {
    "mode": "job",
    "role": "Machine Learning Engineer",
    "jobs": [
      { "company": "AetherMind Labs", "title": "Machine Learning Engineer Intern" }
    ]
  },
  "dataConfidence": { "level": "medium" },
  "nextBestAction": {
    "action": "Learn and apply scikit-learn in an existing project",
    "priority": "high"
  },
  "phases": [
    { "id": "foundations", "title": "Foundations", "order": 1 },
    { "id": "core-skills", "title": "Core Skills", "order": 2 }
  ],
  "tasks": [
    {
      "id": "task-stable-hash",
      "title": "Learn and apply scikit-learn in an existing project",
      "status": "not_started",
      "priority": "high",
      "priorityScore": 10,
      "gapIds": ["ai01:scikit-learn", "job:job-id:req-id"]
    }
  ]
}
```

## 16. Limitations

- AI-01 currently has curated role benchmarks for Software Engineer, Frontend Developer, Backend Developer, Full Stack Developer, and Machine Learning Engineer.
- Project evidence is count-only, so project feature-level upgrades cannot yet be verified.
- LeetCode topic history is unavailable and is not inferred.
- GitHub language/activity data does not prove mastery of a framework.
- Saved jobs without structured, evidence-backed requirements can produce fewer job-specific tasks.
- Timelines are deterministic workload estimates, not completion or hiring promises.

These limitations are intentional honesty boundaries and useful talking points in a viva, startup presentation, or software engineering interview.
