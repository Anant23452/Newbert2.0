import React from 'react'
import { Routes,Route } from 'react-router-dom';
import AllumniWall from './pages/AlumniWall';
import Profile from './pages/Profile';
import Roadmap from './pages/Roadmap';
import Jobs from './pages/Jobs';
import Leaderboard from './pages/Leaderboard';
import ResumeAi from './pages/ResumeAi';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Notes, { BranchNotes } from './pages/Notes';
import AlumniProfile from './pages/AlumniProfile';


function Routing() {
  return (
    <Routes>
        <Route path="/" element={<Home/> }/>
        <Route path="/alumni-wall" element={<AllumniWall/> }/>
        <Route path="/alumni-wall/:alumniId" element={<AlumniProfile/> }/>
        <Route path="/profile" element={<Profile/> }/>
        <Route path="/roadmap" element={<Roadmap/> }/>
        < Route path="/jobs" element={<Jobs/> }/>
        < Route path="/leaderboard" element={<Leaderboard/> }/>
        < Route path="/resume-ai" element={<ResumeAi/> }/>
        < Route path="/courses" element={<Courses/> }/>
        < Route path="/notes" element={<Notes/> }/>
        < Route path="/notes/:branchId" element={<BranchNotes/> }/>
    </Routes>
  )
}

export default Routing
