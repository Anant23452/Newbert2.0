import { useState } from "react";
import AlumniCard from "../components/AlumniCard";
import { dummyAlumni } from "../data/dummyAlumni";

const filters = ["All", "Placement", "GATE"];
function AlumniWall() {
  //primary filter state
  const [activeFilter, setActiveFilter] = useState("All");

  //secondary filter state
  const [subFilter, setSubFilter] = useState(null);

  // filter loginc 1 - using ternary operator
  const filteredAlumni =
    activeFilter === "All"
      ? dummyAlumni
      : dummyAlumni.filter(
          (a) => a.type.toLowerCase() === activeFilter.toLowerCase(),
        );

  // FILTER LOGIC-2 using if else
  // const filteredAlumni = dummyAlumni.filter((a) => {
  //   if (activeFilter === "All") return true
  //   if (activeFilter === "Placement") return a.type === "placement"
  //   if (activeFilter === "GATE") return a.type === "gate"

  //   return true
  // })

  //filter logic for secndary filter
  const SecondaryFilteredAlumni = filteredAlumni.filter((a) => {
    if (subFilter === "null") return true;
    if (activeFilter === "Placement") {
      if (subFilter === "0-5") return a.package >= 0 && a.package <= 5;
      if (subFilter === "5-10") return a.package > 5 && a.package <= 10;
      if (subFilter === "10-15") return a.package > 10 && a.package <= 15;
      if (subFilter === "15-20") return a.package > 15 && a.package <= 20;
      if (subFilter === "20-25") return a.package > 20 && a.package <= 25;
      if (subFilter === "25-30") return a.package > 25 && a.package <= 30;
      if (subFilter === "35-40") return a.package > 35 && a.package <= 40;
      if (subFilter === "40-45") return a.package > 40 && a.package <= 45;
      if (subFilter === "45-50") return a.package > 45 && a.package <= 50;
    } else {
      if (subFilter == "<100") return a.gateAIR > 0 && a.gateAIR <= 100;
      if (subFilter == "<500") return a.gateAIR > 100 && a.gateAIR <= 500;
      if (subFilter == "<1000") return a.gateAIR > 500 && a.gateAIR <= 1000;
      if (subFilter == "<2000") return a.gateAIR > 1000 && a.gateAIR <= 2000;
      if (subFilter == "<5000") return a.gateAIR > 2000 && a.gateAIR <= 5000;
      if (subFilter == "<10000")return a.gateAIR > 5000 && a.gateAIR <= 10000;
     
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-orange-50 pb-10">
      {/* PAGE HEADER */}
      <div className="bg-gray-900 px-5 py-6">
        <h1 className="text-white font-bold text-xl mb-1">Alumni wall</h1>
        <p className="text-gray-400 text-sm">
          Real placement journeys from AKTU students
        </p>

        {/* STATS ROW */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-orange-400 font-bold text-lg">347</div>
            <div className="text-gray-400 text-xs">Placed</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-green-400 font-bold text-lg">153</div>
            <div className="text-gray-400 text-xs">GATE cleared</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-white font-bold text-lg">40+</div>
            <div className="text-gray-400 text-xs">Colleges</div>
          </div>
        </div>
      </div>

      {/* FILTER CHIPS */}
      <div className="px-5 py-4 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => {
              setActiveFilter(f);
              setSubFilter(null);
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              activeFilter === f
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* subfilter chips - only show when placement or gate is selected */}
      {activeFilter === "Placement" && (
        <div className="px-5 pb-2 flex gap-2">
          {["All", "0-5", "5-10", "10+"].map((f) => (
            <button
              key={f}
              onClick={() => setSubFilter(f)}
              className={`px-3 py-1 rounded-full text-xs ${
                subFilter === f
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {f} LPA
            </button>
          ))}
        </div>
      )}
      {activeFilter === "GATE" && (
        <div className="px-5 pb-2 flex gap-2">
          {["All","<100", "<500", "<1000", "<5000"].map((f) => (
            <button
              key={f}
              onClick={() => setSubFilter(f)}
              className={`px-3 py-1 rounded-full text-xs ${
                subFilter === f
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              AIR {f}
            </button>
          ))}
        </div>
      )}

      {/* ALUMNI CARDS */}
     <div className="px-5 flex flex-col gap-4">
  {/* Ab hum SecondaryFilteredAlumni use karenge jo actual filtered data hai */}
  {SecondaryFilteredAlumni.length > 0 ? (
    SecondaryFilteredAlumni.map((alumni) => (
      <AlumniCard key={alumni.id} alumni={alumni} />
    ))
  ) : (
    <div className="text-center text-gray-400 py-10">
      {/* Agar koi package ya AIR match nahi hua toh ye dikhega */}
      No alumni found for this specific range
    </div>
  )}
</div>
    </div>
  );
}

export default AlumniWall;
