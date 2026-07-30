# Newbert Frontend to Backend Guide

This document explains what is currently running in the Newbert frontend, where each screen gets its data, and what to replace when the backend and database are ready.

## 1. The Big Picture

Today, the app is a working frontend prototype. It uses three kinds of data:

| Type | Meaning | Current examples |
| --- | --- | --- |
| Dummy data | Hard-coded example records used to make a page feel real | alumni, courses, leaderboard users, skill scores |
| Local storage | Data saved only in the current browser | profile, theme choice, saved jobs |
| API data | Data requested from Express/MongoDB | only the old auth service is prepared for this |

When backend work starts, replace dummy data and local storage **one feature at a time**. Do not try to connect every page in one day.

```
React page -> service file -> Express route -> controller -> MongoDB model
```

Example:

```
Profile.jsx -> profileService.js -> POST /api/profiles -> profileController -> Profile collection
```

## 2. Important Folders

| Folder or file | What it does |
| --- | --- |
| `src/pages/` | Complete screens the student visits |
| `src/components/` | Reusable UI pieces such as Navbar and auth modal |
| `src/data/` | Dummy data. Replace with API data later |
| `src/Services/` | Place for Axios API functions |
| `src/utils/` | Small browser-only helpers. `jobApplications.js` currently uses local storage |
| `src/App.jsx` | Global theme and global auth modal |
| `src/Routing.jsx` | Every frontend URL and the page it opens |
| `src/index.css` | Shared orange theme, day/night rules, cards, controls, responsive styling |

## 3. Current Browser Storage

These keys are stored only in the student browser. They are useful for frontend development, but not permanent user data.

| Key | Written by | Contains | Backend replacement |
| --- | --- | --- |
| `newbert-theme` | `App.jsx` | `day` or `night` | `User.preferences.theme` |
| `newbert-profile` | `AuthModel.jsx`, `Profile.jsx` | name, email, links, college, skills, target company | `Profile` document connected to logged-in user |
| `newbert-saved-jobs` | `utils/jobApplications.js` | saved job records and application status | `JobApplication` collection |

### Important rule

Do not store passwords, Google tokens, GitHub tokens, resumes, or private user data in local storage. Tokens belong in secure HTTP-only cookies or carefully managed secure storage after backend authentication is added.

## 4. Page-by-Page Map

### Home (`/`)

**Current frontend features**

- Hero section and day/night visual effect
- Alumni, Roadmap, Jobs, and Profile navigation
- Aditya story panel with local React state

**Current data**: hard-coded copy in `src/pages/Home.jsx`.

**Later API options**

- `GET /api/public/stats` for real college, alumni, and student counts
- `GET /api/public/success-stories` for featured alumni stories

### Authentication modal

**Files**: `src/components/AuthModel.jsx`, `src/App.jsx`

**Current frontend behavior**

- Email flow collects name and email.
- The data is placed in `newbert-profile` so Profile setup can begin immediately.
- Google, mobile, Apple, and GitHub buttons are visual placeholders until OAuth is connected.

**Backend work needed**

| Feature | Endpoint |
| --- | --- |
| Email sign-up | `POST /api/auth/register` |
| Email login | `POST /api/auth/login` |
| Google login callback | `POST /api/auth/google` |
| Current logged-in account | `GET /api/auth/me` |
| Logout | `POST /api/auth/logout` |

**Database fields**

```js
User: {
  name, email, passwordHash, googleId,
  role: "student" | "alumni" | "admin",
  createdAt
}
```

Never keep a plaintext password. Use `bcrypt` to hash passwords and verify JWTs or session cookies on protected routes.

### Profile (`/profile`)

**Current frontend features**

- Profile completion: college, branch, graduation year, bio, target company
- GitHub, LeetCode, LinkedIn, avatar and cover image inputs
- Dummy skill detection and activity data
- Company readiness percentage
- Skill bars, combined contribution strip, current/longest streak, saved jobs

**Current data**

- Profile: `newbert-profile` local storage
- Skill scores and activity: arrays inside `Profile.jsx`
- Saved jobs: `newbert-saved-jobs`

**Backend endpoints**

| Purpose | Endpoint |
| --- | --- |
| Read profile | `GET /api/profiles/me` |
| Create or update profile | `PUT /api/profiles/me` |
| Upload avatar/cover | `POST /api/uploads/profile-image` |
| Connect GitHub | `POST /api/integrations/github/connect` |
| Sync GitHub public activity | `POST /api/integrations/github/sync` |
| Connect LeetCode | `POST /api/integrations/leetcode/connect` |
| Sync LeetCode activity | `POST /api/integrations/leetcode/sync` |
| Calculate readiness | `GET /api/profiles/me/readiness?company=TCS%20Digital` |

**Database fields**

```js
Profile: {
  userId, college, branch, graduationYear, bio,
  githubUrl, leetcodeUrl, linkedinUrl,
  avatarUrl, coverUrl, targetCompany,
  skills: [{ name, score, source }],
  currentStreak, longestStreak, updatedAt
}
```

The current company readiness percentage is a frontend demo calculation. Later it should come from a backend service that compares the profile skill list against a company/role requirements record.

### Alumni Wall and Alumni Profile (`/alumni-wall`)

**Current data**: `src/data/dummyAlumni.js`.

**Current frontend features**

- Search and placement/GATE filters
- Alumni detail route
- Student-to-senior gap comparison
- Mentorship request UI
- Verification explanation dialog

**Backend endpoints**

```text
GET  /api/alumni?search=&type=&college=&company=
GET  /api/alumni/:id
POST /api/alumni/:id/mentorship-requests
POST /api/alumni/:id/verify              (admin only)
```

**Models needed**: `Alumni`, `AlumniOutcome`, `MentorshipRequest`.

### Roadmap (`/roadmap`)

**Current data**: role list and tasks in `Roadmap.jsx`. Checkbox state is React state only, so refresh clears it.

**Backend endpoints**

```text
GET  /api/roadmaps/me?role=Frontend%20developer
POST /api/roadmaps/me/tasks
PATCH /api/roadmaps/me/tasks/:taskId
```

**Model needed**: `RoadmapTask { userId, title, week, status, linkedCourseId, linkedJobId }`.

### Jobs (`/jobs`)

**Current data**: local `jobs` array in `Jobs.jsx`.

**Current frontend features**

- Fit score, missing skills, job detail modal
- Bookmark action and application status

**Backend endpoints**

```text
GET  /api/jobs?role=&location=&skills=
GET  /api/jobs/:id
GET  /api/jobs/:id/match
POST /api/job-applications
PATCH /api/job-applications/:id
GET  /api/job-applications/me
```

Replace `utils/jobApplications.js` only after these APIs work. Until then it is useful for frontend testing.

### Resume AI (`/resume-ai`)

**Current data**

- Resume upload is held in browser memory only.
- Job description analysis, score, rewrite suggestions, and questions are frontend demo logic.
- Senior matching reads `dummyAlumni.js`.

**Backend endpoints**

```text
POST /api/resume/analyze              (multipart PDF + job description)
GET  /api/resume/analyses/:id
POST /api/resume/analyses/:id/download
GET  /api/alumni?company=TCS%20Digital
```

The server should extract PDF text, call your approved AI provider, validate output, store the analysis, and return only safe structured data to React.

### Courses (`/courses`)

**Current data**: course array inside `Courses.jsx` and alumni evidence from `dummyAlumni.js`.

**Backend endpoints**

```text
GET /api/courses?role=Full%20Stack&skills=React,JavaScript
GET /api/courses/:id
POST /api/course-progress
GET /api/course-recommendations/me
```

**Models needed**: `Course`, `CourseReview`, `CourseProgress`, `CourseRecommendation`.

### Notes (`/notes`, `/notes/:branchId`)

**Current data**: branch, semester, subject and five-unit data inside `Notes.jsx`. Download currently creates a browser text file. The YouTube button opens a topic search because real Newbert video URLs are not stored yet.

**Backend endpoints**

```text
GET /api/notes/branches
GET /api/notes?branch=information-technology&semester=sem3
GET /api/notes/units/:unitId
GET /api/notes/units/:unitId/download
PATCH /api/notes/progress/:unitId
```

Store direct YouTube URLs in the note/unit records. Do not hard-code the final video URLs inside JSX.

### Leaderboard (`/leaderboard`)

**Current data**: `MOCK_LEETCODE_USERS`, `MOCK_GIT_USERS`, and `MOCK_STREAK_USERS` inside `LeaderBoard.jsx`.

**Backend endpoints**

```text
GET /api/leaderboard?scope=global&college=&platform=both&timeframe=7d
GET /api/leaderboard/me
```

**Model needed**: `ActivityEvent { userId, source, occurredAt, score }`. Build leaderboard totals from activity events rather than trusting the browser.

## 5. API Service Pattern

Create one Axios client in `src/Services/api.js` and import it from feature service files.

```js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export default API;
```

Then create focused files:

```text
src/Services/authService.js
src/Services/profileService.js
src/Services/jobService.js
src/Services/alumniService.js
src/Services/courseService.js
src/Services/noteService.js
src/Services/resumeService.js
src/Services/leaderboardService.js
```

Example profile service:

```js
import API from "./api";

export const getMyProfile = () => API.get("/profiles/me");
export const updateMyProfile = (data) => API.put("/profiles/me", data);
export const syncGitHub = () => API.post("/integrations/github/sync");
```

Example React usage:

```js
useEffect(() => {
  getMyProfile()
    .then((response) => setProfile(response.data))
    .catch(() => setError("Could not load your profile."));
}, []);
```

## 6. Environment Files

Create `newbert-frontend/.env` for local development:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Create `newbert-backend/.env`:

```env
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=a-long-random-secret
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Never commit `.env`. Commit `.env.example` files without real secrets.

## 7. Recommended Backend Order

1. Connect MongoDB and create `User` and `Profile` models.
2. Build register/login/current-user/logout routes.
3. Replace profile local storage with `GET` and `PUT /api/profiles/me`.
4. Move saved job actions into `JobApplication` APIs.
5. Move alumni and notes dummy arrays into collections.
6. Add GitHub sync. Add LeetCode only after checking its supported API/data method.
7. Add real recommendation logic and Resume AI last.

This order gives every other feature a reliable logged-in student profile first.

## 8. Before Replacing Any Dummy Data

For each feature, do this sequence:

1. Keep the current JSX and styles.
2. Move the local array into a `*Service.js` API call.
3. Add `loading`, `error`, and empty states.
4. Check that the API response has exactly the fields the component needs.
5. Remove the dummy array only after the real page works.

This prevents the frontend from breaking while backend work is still in progress.

## 9. Current Backend Status

`newbert-backend/server.js` currently starts Express, enables CORS and JSON, and mounts only `/api/auth`.

Before frontend integration, add database connection, environment variables, protected-route middleware, input validation, password hashing, and feature route mounting. The existing password check is only an early prototype and must not be used for real accounts.
