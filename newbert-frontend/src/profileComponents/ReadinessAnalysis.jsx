const confidenceTone = {
  low: "border-amber-200 bg-amber-50 text-amber-800",
  medium: "border-orange-200 bg-orange-50 text-orange-800",
  high: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const severityTone = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-orange-50 text-orange-800 border-orange-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function ReadinessAnalysis({ analysis, loading, error, onEdit }) {
  if (loading) return <section className="surface rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="h-5 w-40 animate-pulse rounded bg-slate-200"/><div className="mt-4 h-16 w-32 animate-pulse rounded bg-slate-100"/><div className="mt-6 h-28 animate-pulse rounded bg-slate-100"/></section>;
  if (error || !analysis) return <section className="surface rounded-2xl border border-amber-200 bg-amber-50 p-6"><p className="text-xs font-extrabold uppercase tracking-widest text-amber-800">Readiness analysis</p><h2 className="mt-2 text-xl font-extrabold text-slate-950">Your profile is still available.</h2><p className="mt-2 text-sm leading-6 text-slate-700">{error || "Readiness analysis could not be loaded right now."}</p></section>;

  const overall = analysis.coverage.overall;
  const categories = Object.entries(analysis.coverage).filter(([key]) => key !== "overall");
  return <>
    <section className="surface rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Readiness Coverage</p>
          {overall.status === "available" ? <><p className="mt-2 text-5xl font-black text-slate-950">{overall.value}%</p><p className="mt-2 text-sm font-semibold text-slate-600">Based on available evidence</p></> : <><h2 className="mt-2 max-w-2xl text-xl font-extrabold text-slate-950">{overall.explanation}</h2>{!analysis.targetRole?.supported && <button type="button" onClick={onEdit} className="mt-4 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-orange-600">Choose target role</button>}</>}
        </div>
        <div className="sm:text-right">
          <p className="text-sm font-extrabold text-slate-950">Target: {analysis.targetRole?.label || "Not selected"}</p>
          <span className={`mt-2 inline-flex rounded-md border px-2.5 py-1 text-xs font-extrabold uppercase ${confidenceTone[analysis.dataConfidence.level]}`}>Data Confidence: {analysis.dataConfidence.level}</span>
          {analysis.metadata?.generatedAt && <p className="mt-2 text-xs font-semibold text-slate-500">Analyzed {new Date(analysis.metadata.generatedAt).toLocaleString()}</p>}
        </div>
      </div>

      <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
        {categories.map(([key, category]) => <div key={key}>
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-extrabold text-slate-800">{category.label}</p><span className="text-sm font-extrabold text-orange-700">{category.status === "available" ? `${category.value}%` : "Unavailable"}</span></div>
          {category.status === "available" && <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${category.value}%` }}/></div>}
          <p className="mt-2 text-xs leading-5 text-slate-500">{category.explanation}</p>
        </div>)}
      </div>

      <details className="mt-6 border-t border-slate-100 pt-5">
        <summary className="cursor-pointer text-sm font-extrabold text-orange-700">Why am I seeing this?</summary>
        <p className="mt-3 text-sm leading-6 text-slate-600">{overall.explanation}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Available sources</p><p className="mt-2 text-sm text-slate-600">{analysis.dataConfidence.availableSources.map((source) => source.label).join(", ") || "None yet"}</p></div>
          <div><p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Missing sources</p><p className="mt-2 text-sm text-slate-600">{analysis.dataConfidence.missingSources.map((source) => source.label).join(", ") || "None"}</p></div>
        </div>
      </details>
    </section>

    <section className="surface rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Gap analysis</p>
      <h2 className="mt-2 text-2xl font-extrabold text-slate-950">Evidence gaps to address next</h2>
      {analysis.gaps.length ? <div className="mt-6 divide-y divide-slate-100">{analysis.gaps.slice(0, 6).map((gap) => <article key={`${gap.category}-${gap.item}`} className="py-5 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-extrabold text-slate-950">{gap.item}</h3><p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{gap.category}</p></div><span className={`rounded-md border px-2.5 py-1 text-xs font-extrabold capitalize ${severityTone[gap.severity]}`}>{gap.severity} priority</span></div><dl className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-3"><div><dt className="font-extrabold text-slate-800">Why</dt><dd className="text-slate-600">{gap.reason}</dd></div><div><dt className="font-extrabold text-slate-800">Evidence</dt><dd className="text-slate-600">{gap.evidence}</dd></div><div><dt className="font-extrabold text-slate-800">Next</dt><dd className="text-slate-600">{gap.recommendedAction}</dd></div></dl></article>)}</div> : <p className="mt-5 text-sm leading-6 text-slate-600">No evidence gap can be stated reliably yet. Missing data remains unknown rather than being treated as a weakness.</p>}
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <div className="surface rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Top priorities</p><h2 className="mt-2 text-xl font-extrabold text-slate-950">Your next three evidence-based actions</h2>{analysis.priorities.length ? <ol className="mt-5 space-y-4">{analysis.priorities.map((priority) => <li key={priority.rank} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-500 text-xs font-black text-white">{priority.rank}</span><div><p className="font-extrabold text-slate-950">{priority.item}</p><p className="mt-1 text-sm leading-6 text-slate-600">{priority.recommendedAction}</p></div></li>)}</ol> : <p className="mt-5 text-sm leading-6 text-slate-600">Add enough evidence for Newbert to rank meaningful next actions.</p>}</div>
      <div className="surface rounded-2xl border border-orange-200 bg-orange-50/60 p-6 shadow-sm"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-700">Newbert AI insight</p><h2 className="mt-2 text-xl font-extrabold text-slate-950">Understand the structured analysis</h2><p className="mt-2 text-xs font-semibold text-slate-500">{analysis.aiExplanation.available ? "AI explanation based on Newbert's structured analysis" : "Deterministic fallback shown; readiness does not depend on Gemini"}</p><p className="mt-5 text-sm leading-6 text-slate-700">{analysis.aiExplanation.summary}</p><p className="mt-4 border-t border-orange-200 pt-4 text-sm font-semibold leading-6 text-slate-800">{analysis.aiExplanation.nextActionExplanation}</p></div>
    </section>
  </>;
}
