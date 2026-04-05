export default function AlumniCard({ alumni }) {
  const isPlacement = alumni.type === "placement"

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-orange-400 transition-all cursor-pointer">
      
      {/* TOP ROW — Avatar + Name + Badge */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${alumni.avatarColor}`}>
          {alumni.initials}
        </div>
        <div className="flex-1">
          <div className="font-bold text-gray-900 text-sm">{alumni.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">{alumni.college} · {alumni.batch}</div>
          <div className="text-xs text-gray-500">{alumni.company}</div>
        </div>
        {/* Package or AIR badge */}
        {isPlacement ? (
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
            {alumni.package} LPA
          </span>
        ) : (
          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
            AIR {alumni.gateAIR}
          </span>
        )}
      </div>

      {/* TYPE BADGE */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${isPlacement ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
          {isPlacement ? '💼 Placed' : '🎓 GATE'}
        </span>
        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
          {alumni.role}
        </span>
      </div>

      {/* SKILLS */}
      <div className="flex gap-1 flex-wrap mb-3">
        {alumni.skills.slice(0,4).map((skill, i) => (
          <span key={i} className={` text-gray-600 text-xs px-2 py-1 rounded-full ${skill=="JavaScript"?"bg-yellow-100":"bg-gray-100"}`} >
            {skill}
          </span>
        ))}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {isPlacement ? (
          <>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="font-bold text-gray-900 text-sm">{alumni.dsaSolved}</div>
              <div className="text-xs text-gray-400">DSA solved</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="font-bold text-gray-900 text-sm">{alumni.projects}</div>
              <div className="text-xs text-gray-400">Projects</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="font-bold text-gray-900 text-sm">{alumni.prepMonths} mo</div>
              <div className="text-xs text-gray-400">Prep time</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="font-bold text-green-600 text-sm">{alumni.gateScore}</div>
              <div className="text-xs text-gray-400">GATE score</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="font-bold text-gray-900 text-sm">AIR {alumni.gateAIR}</div>
              <div className="text-xs text-gray-400">All India Rank</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="font-bold text-gray-900 text-sm">{alumni.prepMonths} mo</div>
              <div className="text-xs text-gray-400">Prep time</div>
            </div>
          </>
        )}
      </div>

      {/* QUOTE */}
      <div className="bg-orange-50 rounded-lg p-3 grid grid-cols-2">
        <p className="text-xs text-orange-900 leading-relaxed italic">
          "{alumni.quote}"
        </p>
        <div className="text-xs text-white-900 flex items-center justify-end">
          <button className="border border-black-200 bg-orange-600 p-2 rounded-lg ">Match Ur Profile</button>
        </div>
      </div>

    </div>
  )
}