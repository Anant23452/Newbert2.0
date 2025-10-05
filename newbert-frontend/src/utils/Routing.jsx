import React from 'react'
import { Routes,Route } from 'react-router-dom';
import Home from "../pages/Home"
import Dashboard from '../pages/Dashboard';



function Routing() {
  return (
    <Routes>
        <Route path="/" element={<Home/> }/>
        <Route path="/dashboard" element={<Dashboard/> }/>
    </Routes>
  )
}

export default Routing