import React, { lazy, Suspense } from 'react'
import { Link, Routes,Route } from 'react-router-dom';
import Home from './pages/Home';

const AllumniWall = lazy(() => import('./pages/AlumniWall'));
const AlumniProfile = lazy(() => import('./pages/AlumniIntelligenceProfile'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Jobs = lazy(() => import('./pages/Jobs'));
const AdminJobs = lazy(() => import('./pages/AdminJobs'));
const AdminCourses = lazy(() => import('./pages/AdminCourses'));
const Leaderboard = lazy(() => import('./pages/LeaderboardMetrics'));
const Mentorship = lazy(() => import('./pages/Mentorship'));
const ResumeAi = lazy(() => import('./pages/ResumeAi'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Notes = lazy(() => import('./pages/Notes'));
const BranchNotes = lazy(() => import('./pages/Notes').then((module) => ({ default: module.BranchNotes })));


function Routing() {
  return (
    <Suspense fallback={<PageLoader/>}><Routes>
        <Route path="/" element={<Home/> }/>
        <Route path="/alumni-wall" element={<AllumniWall/> }/>
        <Route path="/alumni-wall/:alumniId" element={<AlumniProfile/> }/>
        <Route path="/profile" element={<Profile/> }/>
        <Route path="/profile/:userId" element={<PublicProfile/> }/>
        <Route path="/complete-profile" element={<Profile/> }/>
        <Route path="/roadmap" element={<Roadmap/> }/>
        < Route path="/jobs" element={<Jobs/> }/>
        <Route path="/admin/jobs" element={<AdminJobs/> }/>
        <Route path="/admin/courses" element={<AdminCourses/>}/>
        < Route path="/leaderboard" element={<Leaderboard/> }/>
        <Route path="/mentorship" element={<Mentorship/>}/>
        < Route path="/resume-ai" element={<ResumeAi/> }/>
        < Route path="/courses" element={<Courses/> }/>
        <Route path="/courses/:courseId" element={<CourseDetail/>}/>
        < Route path="/notes" element={<Notes/> }/>
        < Route path="/notes/:branchId" element={<BranchNotes/> }/>
        <Route path="*" element={<NotFound/>}/>
    </Routes></Suspense>
  )
}

export default Routing

function NotFound() {
  return <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-3xl place-items-center px-5 py-16 text-center"><div><p className="eyebrow">404</p><h1 className="mt-3 text-3xl font-extrabold text-slate-950">This page is not part of Newbert yet.</h1><p className="mt-3 text-sm leading-6 text-slate-600">The link may be outdated, or the page may have moved.</p><Link to="/" className="mt-7 inline-block bg-orange-500 px-5 py-3 text-sm font-extrabold text-[#171918] hover:bg-orange-400">Go to home</Link></div></main>;
}

function PageLoader() {
  return <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-[#111827] px-5 text-center text-white"><div><div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/15 border-t-orange-400"/><p className="mt-4 text-sm font-bold text-slate-300">Loading Newbert...</p></div></main>;
}
