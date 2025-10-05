import React, { useState } from "react";
import AuthModel from "./AuthModel";

function Navbar() {
    //mobile view ke liye 
    const [modelOpen, setModelOpen]=useState(false);

    //login ke liye
    const[showAuth,setShowAuth] =useState(false);

    //ab logine ho gaya to user ka name show karne ke liye
    const[user,setUser]=useState(null);

    //user login karega to setuser me user ka data a jayega or login ki jaga profile dikehga
    const handleLogin = (userData) => {
    setUser(userData);
    setShowAuth(false);
  };
 
  // user logout ke liye 
  const handleLogout = () => {
    setUser(null);
  };

  return (
    <>
<nav className="w-full h-[10vh]  flex justify-center items-center px-4 py-9 border-b-2 border-zinc-600">
      <div className="logo flex items-center gap-1  w-full">
  <img
    src="/src/assets/2-removebg-preview(1).png"
    alt="Newbert Logo"
    className="select-none h-[4rem] w-auto object-contain"
  />
  <h1 className="text-3xl font-bold select-none " >Newbert</h1>
</div>

    
      <div className="w-full h-full  flex  items-center  gap-4 px-4 ">
       
        <div className="link text-white flex gap-10 px-8 items-center p-2">
          {[
            "Home",
            "Academics",
            "Carrer",
            "Community",
            "About",
            "sell",
            "Request.call",
          ].map((item, index) => {
            return (
              <a className="text-white w-full select-none " index={index} href="">
                {item}
              </a>
            );
          })}
        </div>
      
        <div className="login ">
            {user ?(<h1>anant</h1> ):(
                 <button onClick={()=>setShowAuth(true)} className="bg-white text-black p-1 rounded-lg">Login</button>
            )
        }
         
        </div>
      </div>
    </nav>
    {/* {showAuth && <AuthModel/>} */}
           <AuthModel
            isOpen={showAuth} 
            onClose={() => setShowAuth(false)} 
            onLoginSucess={handleLogin}
            />
   
    </>
  );
}

export default Navbar;
