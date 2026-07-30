# Newbert AI Implementation Playbook

This guide explains how to build AI features for Newbert without making the system too complex or unsafe.

## 1. The Most Important Rule

Do **not** start by training a separate AI model for Resume AI, Jobs, Courses, Alumni, and Company Analysis.

For the first version, Newbert needs:

1. Good student, alumni, course, and job data.
2. Normal scoring algorithms for measurable comparisons.
3. One AI provider behind the backend for language tasks.
4. Clear prompts and structured JSON responses.
5. Retrieval of real Newbert records before the AI responds.

The model should explain Newbert data. It should not invent alumni outcomes, company requirements, interview questions, or resume achievements.

```
React frontend -> Newbert backend -> data + scoring -> AI provider -> validated JSON -> frontend
```

Never call an AI provider directly from React. API keys must remain on the backend.

## 2. What Needs AI and What Does Not

| Newbert feature | Use normal code first | Use AI for |
| --- | --- | --- |
| Student vs alumni comparison | Compare skills, DSA count, projects, college, target role | Explain the most useful next actions in simple language |
| Job matching | Calculate overlap between job requirements and student skills | Summarize fit, explain risks, suggest resume changes |
| Resume AI | Extract sections, compare keywords, check required fields | Rewrite bullets, explain improvements, prepare interview questions |
| Course recommendation | Score skill gap, role fit, course ratings, alumni outcomes | Explain why one course is a better next step |
| Company readiness | Compare profile against a verified role requirement matrix | Coach the student on an improvement plan |
| Notes | Search notes by branch, subject and unit | Explain concepts, create quizzes, summarize a unit |
| Alumni search | Filter by company, college, role, batch, package | Natural-language search such as “backend seniors from AKTU” |

If a result can be calculated accurately with code, calculate it with code. AI should improve clarity and personalization, not replace facts.

## 3. The AI Architecture

Create a new backend folder structure when you start AI work:

```text
newbert-backend/
  ai/
    aiProvider.js
    prompts/
      compareAlumni.js
      analyzeResume.js
      explainJobMatch.js
      recommendCourses.js
      companyReadiness.js
    schemas/
      resumeAnalysisSchema.js
      alumniComparisonSchema.js
      jobMatchSchema.js
  services/
    profileScoringService.js
    alumniComparisonService.js
    jobMatchService.js
    resumeService.js
    courseRecommendationService.js
    readinessService.js
  routes/
    aiRoutes.js
```

### Why this structure matters

- `routes/` receives a request from React.
- `services/` collects data and calculates facts.
- `ai/prompts/` contains the instruction for one AI job.
- `ai/schemas/` checks that the returned JSON has the right shape.
- `aiProvider.js` is the only file that knows which AI company/model is being used.

If you later change provider or model, you edit one file instead of every page.

## 4. Model Strategy

You usually need three model roles, not one model per Newbert feature.

| Role | Used for | Important quality |
| --- | --- | --- |
| Fast text model | tags, keyword extraction, short explanations, course reasons | low cost and fast response |
| Strong reasoning model | resume rewrite, complex comparison, multi-step career plan | accuracy and better writing |
| Embedding model | semantic search over notes, courses, alumni stories, job descriptions | similarity search |

Keep the model name in environment variables instead of hard-coding it:

```env
AI_PROVIDER=openai
AI_FAST_MODEL=your-fast-text-model
AI_REASONING_MODEL=your-strong-reasoning-model
AI_EMBEDDING_MODEL=your-embedding-model
```

This lets you test a cheaper model first, then upgrade without changing business logic.

## 5. Data You Must Collect Before AI Is Useful

AI quality depends more on data quality than on prompt length.

### Student profile data

```js
StudentProfile: {
  userId,
  college, branch, graduationYear,
  targetRoles, targetCompanies,
  skills: [{ name, level, source }],
  projects: [{ name, description, tech, deployedUrl }],
  dsaSolved, githubUrl, leetcodeUrl, linkedinUrl,
  resumeUrl
}
```

### Alumni outcome data

```js
AlumniOutcome: {
  alumniId, college, branch, batch,
  company, role, package,
  skills, dsaSolved, projects,
  preparationMonths, coursesTaken,
  interviewRounds: [{ round, topics, questions, difficulty }],
  verificationStatus
}
```

### Job data

```js
Job: {
  company, title, location, jobType,
  description, requirements, preferredSkills,
  sourceUrl, deadline, verifiedAt
}
```

### Course data

```js
Course: {
  title, provider, url, price, duration,
  skillsTaught, level, syllabus,
  studentRating, alumniOutcomeIds
}
```

### Company requirement matrix

Do not let AI guess company requirements from the internet. Store a reviewed matrix:

```js
CompanyRoleRequirement: {
  company, role,
  requiredSkills: [{ skill, weight }],
  preferredSkills: [{ skill, weight }],
  expectedDsaRange, expectedProjects,
  source, reviewedAt
}
```

## 6. Feature Blueprints

### A. Student vs Alumni Comparison

#### Step 1: calculate facts in code

```js
const sharedSkills = student.skills.filter((skill) => alumni.skills.includes(skill));
const missingSkills = alumni.skills.filter((skill) => !student.skills.includes(skill));
const dsaGap = Math.max(0, alumni.dsaSolved - student.dsaSolved);
const projectGap = Math.max(0, alumni.projects.length - student.projects.length);
```

#### Step 2: send only facts to AI

```js
const context = {
  student: { skills: student.skills, dsaSolved: student.dsaSolved, projects: student.projects.length },
  alumnus: { company: alumni.company, role: alumni.role, skills: alumni.skills, dsaSolved: alumni.dsaSolved, projects: alumni.projects.length },
  computed: { sharedSkills, missingSkills, dsaGap, projectGap }
};
```

#### Step 3: ask for structured output

```js
{
  summary: "...",
  strongestSignal: "...",
  topGaps: [{ title: "", reason: "", priority: "high" }],
  nextWeekTasks: ["..."],
  disclaimer: "This comparison is an estimate, not a hiring prediction."
}
```

#### Endpoint

```text
POST /api/ai/alumni-comparison
Body: { alumniId, studentProfileId }
```

### B. Job Matching

Use a weighted score before AI:

```js
skillScore = matchedRequiredSkillWeights / totalRequiredSkillWeights;
projectScore = projectEvidenceScore;
dsaScore = dsaEvidenceScore;
profileScore = profileCompletionScore;

finalScore = skillScore * 0.55 + projectScore * 0.2 + dsaScore * 0.15 + profileScore * 0.1;
```

Then use AI only to explain the score:

```text
You are a placement coach. Use only the provided job requirements and student facts.
Do not claim the student will be hired.
Give three evidence-based improvements.
```

#### Endpoint

```text
GET /api/jobs/:jobId/match
```

Response:

```js
{
  score: 71,
  matchedSkills: ["React", "JavaScript"],
  missingSkills: ["TypeScript"],
  explanation: "...",
  nextActions: ["..."]
}
```

### C. Resume AI

This needs the strongest safety rules because a resume must never contain false claims.

#### Pipeline

1. Student uploads PDF.
2. Backend extracts text from the PDF.
3. Backend converts text into a structured resume object.
4. Backend extracts structured requirements from job description.
5. Code compares resume evidence to requirements.
6. AI suggests rewrites only from existing resume evidence.
7. Student reviews changes before downloading.

#### Critical prompt rule

```text
Never invent a project, skill, metric, employer, certificate, or achievement.
If evidence is missing, write “add evidence if true” instead of claiming it.
```

#### Resume response shape

```js
{
  matchScore: 68,
  missingKeywords: ["TypeScript"],
  rewriteSuggestions: [
    {
      section: "Projects",
      original: "Built a website",
      suggested: "Built a React website with ...",
      evidenceUsed: ["React project mentioned on resume"],
      needsStudentReview: true
    }
  ],
  interviewQuestions: ["..."]
}
```

#### Endpoint

```text
POST /api/ai/resume-analysis
Content-Type: multipart/form-data
Fields: resume, jobDescription, company
```

### D. Course Recommendation

Do not make AI choose courses by marketing text alone.

#### Score each course in code

```js
courseScore =
  skillGapCoverage * 0.4 +
  targetRoleFit * 0.25 +
  verifiedAlumniUsage * 0.2 +
  ratingQuality * 0.1 +
  timeFit * 0.05;
```

Then ask AI:

```text
Explain why the top three scored courses fit this student.
Mention prerequisites and trade-offs.
Do not promise placement or salary outcomes.
```

#### Endpoint

```text
GET /api/ai/course-recommendations?role=Full%20Stack
```

### E. Company Readiness Analysis

This is not a promise of selection. It is a transparent evidence score.

```js
readiness =
  requiredSkillCoverage * 0.5 +
  preferredSkillCoverage * 0.15 +
  projectEvidence * 0.15 +
  dsaProgress * 0.1 +
  consistencyScore * 0.1;
```

Use AI for:

- a short explanation of the score
- a 30-day plan
- likely interview areas based on verified role requirements and alumni data

#### Endpoint

```text
GET /api/ai/company-readiness?company=TCS%20Digital&role=Frontend%20Engineer
```

### F. Notes AI

When notes and YouTube lectures are available, add retrieval-based Q&A:

1. Store each unit's note text, PDF link, video URL, and subject metadata.
2. Split note text into small chunks.
3. Create embeddings for each chunk.
4. Search the closest chunks when a student asks a question.
5. Give only an answer supported by those chunks.
6. Show the source unit and lecture link below the answer.

This is called **RAG**: Retrieval-Augmented Generation.

## 7. RAG for Newbert

RAG means the model reads relevant Newbert data before answering. It is much safer than asking the model to answer from memory.

Use RAG for:

- alumni stories and interview rounds
- lecture notes and PYQs
- course descriptions and reviews
- company role matrices
- job descriptions

Basic flow:

```text
Student question
  -> create embedding
  -> vector database finds similar Newbert records
  -> backend sends selected records to AI
  -> AI answers with source IDs
```

Possible vector databases: MongoDB Atlas Vector Search, PostgreSQL with pgvector, Pinecone, or another managed vector store. Use the database that best fits your main database and budget.

## 8. Prompt Design

Every prompt should have four parts:

```text
1. Role: “You are Newbert's placement coach.”
2. Scope: “Use only the supplied records.”
3. Rules: “Do not invent facts or guarantee selection.”
4. Output: “Return valid JSON matching this schema.”
```

Example:

```text
You are Newbert's placement coach.
Use only the student profile, verified alumni records, and computed gaps provided below.
Do not infer a company interview process if it is not in the records.
Do not promise a job outcome.
Return JSON with: summary, topGaps, nextWeekTasks, confidenceNote.
```

Keep prompts in separate files. Do not hide long prompts inside React components or controllers.

## 9. Validate AI Output

AI output can be malformed or incomplete. Validate it before sending it to React.

Use a schema validation library such as Zod or Joi on the backend.

```js
const resultSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  nextActions: z.array(z.string()).max(5)
});
```

If validation fails, retry once with a correction instruction or return a safe error message.

## 10. Training: When and When Not

### Do not train first

You do not need custom model training to launch Newbert AI features. Start with prompt engineering, scoring, and RAG.

### Start collecting useful feedback

Store:

- whether a student accepted or rejected a resume suggestion
- whether a recommendation was useful
- whether an alumni comparison was accurate
- corrections made by a human mentor or admin

### Consider fine-tuning later only when

- you have hundreds or thousands of reviewed examples
- output format is repetitive
- prompts are already stable
- a standard model is consistently missing the same pattern
- privacy consent and data retention policies are clear

Fine-tuning may be useful for classifying course tags or converting notes into one consistent quiz format. It is usually not the first solution for career advice or resume content.

## 11. Safety, Privacy and Trust

Newbert handles student career data. Treat it carefully.

### Always do these

- Keep AI API keys on the backend.
- Ask permission before syncing GitHub, LeetCode, or LinkedIn data.
- Do not scrape private profiles.
- Let students remove connected accounts and delete their data.
- Do not send more resume/profile data to AI than needed.
- Log AI request IDs and errors, but avoid logging full private resumes.
- Explain that readiness and job-match numbers are estimates.
- Require human/admin review for public alumni claims.

### Never do these

- Promise a job, package, interview result, or company selection.
- Invent a senior's interview question or course result.
- Expose another student's private score or resume.
- Put secret API keys in Vite variables or React code.

## 12. Frontend Changes When AI APIs Arrive

The existing UI is already a good prototype. Replace its demo calculations with API calls:

| Screen | Current demo | Replace with |
| --- | --- | --- |
| Profile | local readiness and skill arrays | `GET /api/profiles/me/readiness` |
| Resume AI | local keyword/rewrite logic | `POST /api/ai/resume-analysis` |
| Jobs | local job array and fit values | `GET /api/jobs/:id/match` |
| Courses | local recommendation score | `GET /api/ai/course-recommendations` |
| Alumni comparison | local skill comparison | `POST /api/ai/alumni-comparison` |
| Leaderboard | mock arrays | `GET /api/leaderboard` |

For each screen add these states:

```js
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
```

Show a loading state while the AI request runs. AI requests can take longer than normal database requests.

## 13. Build Order for Newbert AI

1. Finish authentication and student profile backend.
2. Create verified alumni, job, course and company requirement collections.
3. Build normal scoring functions and show their results without AI.
4. Add one AI feature first: resume analysis or alumni comparison.
5. Add logging, output validation, loading/error states, and user feedback.
6. Add RAG for notes and alumni stories.
7. Add company readiness and course explanation.
8. Evaluate quality with real students before considering training/fine-tuning.

## 14. What You Should Learn

Learn these topics in this order:

1. JavaScript async/await and HTTP requests.
2. Express routes, controllers, middleware, and MongoDB models.
3. Authentication, JWTs/cookies, and environment variables.
4. API design and request validation.
5. Prompt engineering and structured JSON output.
6. Embeddings and RAG.
7. Evaluation, feedback collection, monitoring, and cost control.
8. Fine-tuning only after the above is working.

The first valuable version of Newbert AI is not “a trained AI.” It is trustworthy data, transparent scoring, useful explanations, and a student who understands exactly what to do next.
