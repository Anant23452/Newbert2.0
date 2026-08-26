import React from 'react'
import { Link, Routes,Route } from 'react-router-dom';
import AllumniWall from './pages/AlumniWall';
import Profile from './pages/Profile';
import Roadmap from './pages/Roadmap';
import Jobs from './pages/Jobs';
import LeaderBoard from './pages/LeaderBoard';
import ResumeAi from './pages/ResumeAi';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Notes, { BranchNotes } from './pages/Notes';
import AlumniProfile from './pages/AlumniProfile';
import AdminJobs from './pages/AdminJobs';


function Routing() {
  return (
    <Routes>
        <Route path="/" element={<Home/> }/>
        <Route path="/alumni-wall" element={<AllumniWall/> }/>
        <Route path="/alumni-wall/:alumniId" element={<AlumniProfile/> }/>
        <Route path="/profile" element={<Profile/> }/>
        <Route path="/complete-profile" element={<Profile/> }/>
        <Route path="/roadmap" element={<Roadmap/> }/>
        < Route path="/jobs" element={<Jobs/> }/>
        <Route path="/admin/jobs" element={<AdminJobs/> }/>
        < Route path="/leaderboard" element={<LeaderBoard/> }/>
        < Route path="/resume-ai" element={<ResumeAi/> }/>
        < Route path="/courses" element={<Courses/> }/>
        < Route path="/notes" element={<Notes/> }/>
        < Route path="/notes/:branchId" element={<BranchNotes/> }/>
        <Route path="*" element={<NotFound/>}/>
    </Routes>
  )
}

export default Routing

function NotFound() {
  return <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-3xl place-items-center px-5 py-16 text-center"><div><p className="eyebrow">404</p><h1 className="mt-3 text-3xl font-extrabold text-slate-950">This page is not part of Newbert yet.</h1><p className="mt-3 text-sm leading-6 text-slate-600">The link may be outdated, or the page may have moved.</p><Link to="/" className="mt-7 inline-block bg-orange-500 px-5 py-3 text-sm font-extrabold text-[#171918] hover:bg-orange-400">Go to home</Link></div></main>;
}
