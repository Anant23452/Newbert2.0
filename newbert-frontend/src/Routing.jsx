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



function Routing() {
  return (
    <Routes>
        <Route path="/" element={<Home/> }/>
        <Route path="/alumni-wall" element={<AllumniWall/> }/>
        <Route path="/profile" element={<Profile/> }/>
        <Route path="/roadmap" element={<Roadmap/> }/>
        < Route path="/jobs" element={<Jobs/> }/>
        < Route path="/leaderboard" element={<Leaderboard/> }/>
        < Route path="/resume-ai" element={<ResumeAi/> }/>
        < Route path="/courses" element={<Courses/> }/>
    </Routes>
  )
}

export default Routing