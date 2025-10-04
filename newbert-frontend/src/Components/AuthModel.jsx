import React, { useState } from "react";


function AuthModal({ isOpen, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);

  if (!isOpen) return null; // hidden by default

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50">
      <div className="bg-white w-[90%] max-w-[20rem] rounded-2xl shadow-lg p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-600 hover:scale-110 transition"
        >
       close
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
          {isSignUp ? "Create your account" : "Welcome back!"}
        </h2>

        {/* Input Fields */}
        <form className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-yellow-400"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-yellow-400"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-yellow-400"
          />

          <button
            type="submit"
            className="w-full bg-yellow-400 text-black py-2 rounded-full font-semibold hover:bg-yellow-300 transition"
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>
           <p className="mt-4 text-sm text-center  text-black">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </span>
        </p>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-grow h-px bg-gray-300"></div>
          <span className="mx-3 text-gray-400 text-sm">OR</span>
          <div className="flex-grow h-px bg-gray-300"></div>
        </div>

        {/* Google Auth */}
        <div className="w-full h-[10vh] flex items-center justify-between ">
            
            <button className="w-[50%] border border-gray-400 rounded-full flex items-center justify-center  hover:bg-gray-100 transition">
          <img
            src="https://download.logo.wine/logo/GitHub/GitHub-Logo.wine.png"
            alt="Github"
            className="contain h-12 w-15"
          />
          
        </button>
        <button className="w-[50%] border border-gray-400 rounded-full flex items-center justify-center  hover:bg-gray-100 transition">
          <img
            src="https://www.citypng.com/public/uploads/preview/google-logo-icon-gsuite-hd-701751694791470gzbayltphh.png"
            alt="Google"
            className="contain h-11 w-15"
          />
          
        </button>
        </div>
        

       
      </div>
    </div>
  );
}

export default AuthModal;
