import React from "react";

function Navbar() {
  return (
<nav className="w-full h-[10vh]  flex justify-center items-center px-4 py-9 border-b-2 border-zinc-600">
      <div className="logo flex items-center justify-between w-full">
  <img
    src="/src/assets/1-removebg-preview(1).png"
    alt="Newbert Logo"
    className="h-[11rem] w-auto object-contain"
  />
</div>

    
      <div className="w-full h-full  flex  items-center  gap-4 ">
       
        <div className="link text-white flex gap-10 px-8 bg-blue-400 fles items-center p-2">
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
              <a className="text-white w-full" index={index} href="">
                {item}
              </a>
            );
          })}
        </div>
      
        <div className="login bg-green-500">
          <button className="bg-white text-black p-2 rounded-lg">Login</button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
