import React from 'react'

function Home() {
  return (
    <>

    {/* // First page */}
    <div className="first-page h-screen  py-20 bg-[#1A1A2E]">
      <div className="head-1   ">
        <h1 className='text-4xl font-bold text-white text-center'>
          Stop guessing. <br />
           See exactly what got <br />
          <span className='text-orange-500' >your seniors placed.</span></h1>
      </div>

     <div className="head-2  mt-2 ">
      <h1 className='text-center text-oklch(86.9% 0.022 252.894) ' >Real placement journeys from students at YOUR college.  <br />Not generic advice. Not IIT stories.  <br /> YOUR college. YOUR truth.</h1>
     </div>

   <div className="hero-btn flex justify-center gap-3 p-2 flex-col sm:flex-row items-center  font-bold mt-5 ">
  <button className="bg-orange-500 text-white px-6 py-2  rounded-2xl">
    See Alumni from Your College
  </button>

  <button className="bg-white text-orange-500 px-6 py-2 rounded-2xl border border-orange-500">
    Check your current gap
  </button>
</div>

<div className="w-full bg-[#1A1A2E] py-10 mt-10">
  <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">

    {/* Stat 1 */}
    <div>
      <h2 className="text-orange-400 text-3xl font-bold">40+</h2>
      <p className="text-gray-400 text-sm mt-1">AKTU colleges</p>
    </div>

    {/* Stat 2 */}
    <div>
      <h2 className="text-orange-400 text-3xl font-bold">500+</h2>
      <p className="text-gray-400 text-sm mt-1">Alumni stories</p>
    </div>

    {/* Stat 3 */}
    <div>
      <h2 className="text-orange-400 text-3xl font-bold">2,000+</h2>
      <p className="text-gray-400 text-sm mt-1">Students guided</p>
    </div>

    {/* Stat 4 */}
    <div>
      <h2 className="text-orange-400 text-3xl font-bold">8 LPA</h2>
      <p className="text-gray-400 text-sm mt-1">Avg package</p>
    </div>

  </div>
</div>


    </div>
      {/* // Second page */}
    <div className="second-page h-screen flex items-center justify-center bg-green-200">

    </div>
    <div className="third-page h-screen flex items-center justify-center bg-blue-200">


    </div>
    <div className="forth-page h-screen flex items-center justify-center bg-yellow-200">

    </div>
    
    
    </>
  )
}

export default Home