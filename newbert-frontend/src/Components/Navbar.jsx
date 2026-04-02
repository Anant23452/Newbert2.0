import React, { useState } from "react";
import AuthModel from "./AuthModel";
import { useNavigate } from "react-router-dom";

function Navbar() {
  //mobile view ke liye
  const [modelOpen, setModelOpen] = useState(false);
2
  //login ke liye
  const [showAuth, setShowAuth] = useState(false);

  //ab logine ho gaya to user ka name show karne ke liye
  const [user, setUser] = useState(null);

  //user login karega to setuser me user ka data a jayega or login ki jaga profile dikehga
  const handleLogin = (userData) => {
    setUser(userData);
    setShowAuth(false);
  };

  //routing ke liye jab click kare to dashboard pe jaye

  const navigate = useNavigate();

  return (
    <>
      <nav className="w-full h-[10vh]  flex justify-center items-center px-4 py-9 border-b-2 border-zinc-600">
        <div className="logo flex items-center gap-1  w-full">
         
          <h1 className="text-2xl font-bold select-none ">
            
         New<span className="text-orange-500">bert</span></h1>
        </div>

        <div className="w-full h-full  flex  items-center  gap-4 px-4 ">
          <div className="link text-white flex gap-10 px-8 items-center p-2">
            {[
              "Home",
              "Alumni wall",
              "Jobs",
              "Resume-AI",
              "Courses",
              "Myroadmap",
              "LeaderBoard",
            ].map((item, index) => {
              return (
                <a
                  className="text-white w-full select-none "
                  index={index}
                  href=""
                >
                  {item}
                </a>
              );
            })}
          </div>

          <div className="login  ">
            {user ? (
              <div className="profile w-12 h-12 bg-blue-400  overflow-hidden cursor-pointer flex items-center gap-2 flex-col rounded-full
               "
              onClick={() => navigate("/dashboard")}
               >
                <h4>Current streke</h4>
                <img
                  src="https://i.pinimg.com/1200x/f0/38/38/f038383985e6289f4c208150818e01ab.jpg"
                  alt="img"
                  className="w-full h-full object-cover  "
                />
                <button onClick={()=>navigate("/dashboard") } >save me</button>
                
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="bg-white text-black p-1 rounded-lg"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>
      {/* {showAuth && <AuthModel/>} */}
      <AuthModel
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onLoginSuccess={handleLogin}
      />
    </>
  );
}

export default Navbar;
