import { useEffect, useId, useState } from "react";
import API from "../Services/api";

const EMPTY_REQUEST = {
  name: "",
  university: "",
  city: "",
  state: "Uttar Pradesh",
  course: "B.Tech",
  website: "",
};

export default function CollegeAutocomplete({
  value,
  selectedCollege,
  onQueryChange,
  onSelect,
  invalid = false,
}) {
  const listboxId = useId();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState(EMPTY_REQUEST);
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    let active = true;
    const query = String(value || "").trim();
    const stillSelected = selectedCollege && query === selectedCollege.name;

    if (!query || stillSelected) {
      setSuggestions([]);
      setLoading(false);
      setSearchError("");
      return undefined;
    }

    setLoading(true);
    setSearchError("");

    const timer = setTimeout(async () => {
      try {
        const { data } = await API.get("/colleges/search", {
          params: { q: query, limit: 10 },
        });

        if (!active) return;
        setSuggestions(data.colleges || []);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        if (!active) return;
        setSuggestions([]);
        setSearchError("No colleges could be loaded. Try again.");
        setOpen(true);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedCollege, value]);

  const chooseCollege = (college) => {
    onSelect(college);
    setSuggestions([]);
    setSearchError("");
    setOpen(false);
    setTouched(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!open || !suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      chooseCollege(suggestions[activeIndex]);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setRequestMessage("");

    try {
      const { data } = await API.post("/colleges/request", request);
      setRequestMessage(data.message);
      setRequest(EMPTY_REQUEST);
    } catch (error) {
      setRequestMessage(error.response?.data?.message || "Unable to submit college request.");
    }
  };

  const showSelectionError = invalid || (touched && value.trim() && !selectedCollege);
  const showDropdown = open && value.trim() && !selectedCollege;

  return (
    <>
      <div className="relative">
        <label htmlFor={`${listboxId}-input`} className="text-sm font-bold text-slate-800">
          College *
        </label>
        <input
          id={`${listboxId}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showDropdown}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          aria-invalid={Boolean(showSelectionError)}
          value={value}
          onKeyDown={handleKeyDown}
          onFocus={() => value.trim() && !selectedCollege && setOpen(true)}
          onBlur={() => {
            setTouched(true);
            window.setTimeout(() => setOpen(false), 120);
          }}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setTouched(false);
            setOpen(true);
          }}
          placeholder="Start typing your college name"
          className={`control mt-2 w-full rounded-md border p-2 text-sm text-slate-900 focus:outline-none ${
            showSelectionError
              ? "border-red-500 focus:border-red-500"
              : "border-slate-300 focus:border-orange-500"
          }`}
        />

        {selectedCollege ? (
          <span className="mt-1 block text-xs font-semibold text-emerald-700">
            Verified college selected
          </span>
        ) : showSelectionError ? (
          <span className="mt-1 block text-xs font-semibold text-red-600">
            Please select a college from the suggestions.
          </span>
        ) : (
          <span className="mt-1 block text-xs text-slate-500">
            Select a verified college from the suggestions.
          </span>
        )}

        {showDropdown ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl"
          >
            {loading ? (
              <p className="px-3 py-3 text-sm font-semibold text-slate-600">Searching colleges...</p>
            ) : searchError ? (
              <p className="px-3 py-3 text-sm font-semibold text-red-600">{searchError}</p>
            ) : suggestions.length ? (
              suggestions.map((college, index) => (
                <button
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  type="button"
                  key={college._id}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => chooseCollege(college)}
                  className={`block w-full border-b border-slate-100 px-3 py-3 text-left last:border-b-0 ${
                    index === activeIndex ? "bg-orange-50" : "hover:bg-orange-50"
                  }`}
                >
                  <span className="block text-sm font-bold text-slate-900">{college.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {[college.city, college.state, college.university].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-sm font-semibold text-slate-600">No matching colleges found.</p>
            )}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setRequest((current) => ({ ...current, name: value || current.name }));
            setRequestOpen(true);
          }}
          className="mt-2 text-xs font-extrabold text-orange-700"
        >
          Can't find your college? Request to add college
        </button>
      </div>

      {requestOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-5">
          <form onSubmit={submitRequest} className="w-full max-w-lg rounded-xl bg-white p-6 text-slate-900">
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">College request</p>
                <h2 className="mt-2 text-xl font-black">Request to add your college</h2>
              </div>
              <button type="button" onClick={() => setRequestOpen(false)} className="text-sm font-bold">
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["name", "College name *"],
                ["university", "University"],
                ["city", "City"],
                ["state", "State"],
                ["website", "College website"],
              ].map(([key, label]) => (
                <label key={key} className="text-sm font-bold">
                  {label}
                  <input
                    required={key === "name"}
                    type={key === "website" ? "url" : "text"}
                    value={request[key]}
                    onChange={(event) => setRequest({ ...request, [key]: event.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 p-2"
                  />
                </label>
              ))}
              <label className="text-sm font-bold">
                Course
                <select
                  value={request.course}
                  onChange={(event) => setRequest({ ...request, course: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 p-2"
                >
                  {["B.Tech", "M.Tech", "BCA", "MCA", "Other"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            {requestMessage ? (
              <p className="mt-4 text-sm font-semibold text-orange-700">{requestMessage}</p>
            ) : null}
            <button className="mt-5 rounded-lg bg-orange-500 px-4 py-3 text-sm font-extrabold text-slate-950">
              Submit request
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
