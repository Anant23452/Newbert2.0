import React, { useState } from "react";


function AuthModal({ isOpen, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);

  if (!isOpen) return null; // hidden by default

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white w-[90%] max-w-md rounded-2xl shadow-lg p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
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

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-grow h-px bg-gray-300"></div>
          <span className="mx-3 text-gray-400 text-sm">OR</span>
          <div className="flex-grow h-px bg-gray-300"></div>
        </div>

        {/* Google Auth */}
        <button className="w-full border border-gray-400 rounded-full py-2 flex items-center justify-center gap-2 hover:bg-gray-100 transition">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png"
            alt="Google"
            className="h-5 w-5"
          />
          Continue with Google
        </button>

       
      </div>
    </div>
  );
}

export default AuthModal;
