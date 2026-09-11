import React, { lazy, Suspense } from 'react'
import { Link, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import useAuth from './hook/useAuth';
import Home from './pages/Home';

const AllumniWall = lazy(() => import('./pages/AlumniWall'));
const AlumniProfile = lazy(() => import('./pages/AlumniIntelligenceProfile'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Jobs = lazy(() => import('./pages/Jobs'));
const AdminJobs = lazy(() => import('./pages/AdminJobs'));
const AdminCourses = lazy(() => import('./pages/AdminCourses'));
const AdminNotes = lazy(() => import('./pages/AdminNotes'));
const Leaderboard = lazy(() => import('./pages/LeaderboardMetrics'));
const Mentorship = lazy(() => import('./pages/Mentorship'));
const ResumeAi = lazy(() => import('./pages/ResumeAi'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Notes = lazy(() => import('./pages/Notes'));
const StudyStudio = lazy(() => import('./pages/StudyStudio'));
const StudyCourse = lazy(() => import('./pages/StudyCourse'));
const BranchNotes = lazy(() => import('./pages/Notes').then((module) => ({ default: module.BranchNotes })));


function Routing() {
  const { profile, loading, isAuthenticated, error, refreshProfile, logout } = useAuth();
  const location = useLocation();
  const requiresSetup = isAuthenticated && location.pathname !== '/complete-profile' && !location.pathname.startsWith('/admin/');
  if (loading && isAuthenticated) return <PageLoader/>;
  if (requiresSetup && !profile && error) return <main className="mx-auto max-w-2xl px-5 py-16"><p role="alert">{error}</p><button onClick={() => refreshProfile().catch(() => {})} className="mt-4 mr-4 text-orange-500">Retry profile</button><button onClick={logout}>Sign out</button></main>;
  if (requiresSetup && profile && !profile.onboardingCompleted) return <Navigate to="/complete-profile" replace state={{ returnTo: location.pathname + location.search }}/>;
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
        <Route path="/admin/notes" element={<AdminNotes/>}/>
        < Route path="/leaderboard" element={<Leaderboard/> }/>
        <Route path="/mentorship" element={<Mentorship/>}/>
        < Route path="/resume-ai" element={<ResumeAi/> }/>
        < Route path="/courses" element={<Courses/> }/>
        <Route path="/courses/:courseId" element={<CourseDetail/>}/>
        < Route path="/notes" element={<Notes/> }/>
        <Route path="/study" element={<StudyStudio/>}/>
        <Route path="/study/:courseId" element={<StudyCourse/>}/>
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
