import { ChevronDown, Eye, Lock } from "lucide-react";

export default function PrivacySelector({ label, value, onChange, disabled = false, dark = true, compact = false }) {
  const Icon = value === "private" ? Lock : Eye;
  const tone = dark
    ? "border-white/15 bg-[#0b1220] text-slate-200 focus:border-orange-400"
    : "border-slate-300 bg-white text-slate-700 focus:border-orange-500";

  return (
    <label className={`inline-flex items-center gap-2 text-[11px] font-bold ${dark ? "text-slate-400" : "text-slate-500"}`}>
      {label ? <span>{label}</span> : null}
      <span className="relative inline-flex items-center">
        <Icon aria-hidden="true" size={compact ? 12 : 13} className="pointer-events-none absolute left-2 text-orange-400" />
        <select
          aria-label={label || "Section visibility"}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`h-8 appearance-none rounded-md border pl-7 pr-6 text-[11px] font-extrabold capitalize outline-none disabled:cursor-wait disabled:opacity-50 ${tone}`}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <ChevronDown aria-hidden="true" size={11} className="pointer-events-none absolute right-2 text-slate-500" />
      </span>
    </label>
  );
}
