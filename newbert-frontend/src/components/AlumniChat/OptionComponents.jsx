import { useState, useEffect } from 'react';
import { Check, Plus, Search, Sparkles, ExternalLink, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import CollegeAutocomplete from '../CollegeAutocomplete';

export const TOP_COMPANIES = [
  'TCS', 'Infosys', 'Accenture', 'Wipro', 'Cognizant', 'Capgemini',
  'Amazon', 'Microsoft', 'Oracle', 'Google', 'Cisco', 'Deloitte',
  'HCLTech', 'Tech Mahindra', 'JPMorgan Chase', 'LTIMindtree', 'Startup'
];

export const TOP_ROLES = [
  'Software Engineer', 'Graduate Engineer Trainee', 'Associate Software Engineer',
  'SDE-1', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Digital Engineer', 'Data Analyst', 'Quality Analyst (QA)', 'DevOps Engineer', 'Other'
];

export const DSA_LANGUAGES = ['Java', 'C++', 'Python', 'JavaScript', 'C', 'Other'];

export const DSA_TOPICS_LIST = [
  'Arrays', 'Strings', 'Hashing', 'Two Pointers', 'Sliding Window', 'Binary Search',
  'Linked List', 'Stack', 'Queue', 'Trees', 'BST', 'Heap / Priority Queue',
  'Graphs', 'Greedy', 'Dynamic Programming', 'Trie', 'Backtracking', 'Bit Manipulation'
];

export const CORE_CS_LIST = [
  'DBMS', 'Operating Systems', 'Computer Networks', 'OOP', 'SQL',
  'System Design', 'Software Engineering', 'None / Very little'
];

export const SKILL_CATEGORIES = {
  'Frontend': ['React', 'Next.js', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Tailwind CSS', 'Redux', 'Vue.js'],
  'Backend': ['Node.js', 'Express.js', 'Python', 'FastAPI', 'Django', 'Java', 'Spring Boot', 'C++', 'Go', 'PHP'],
  'Database': ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase', 'Prisma', 'SQL', 'SQLite'],
  'Core CS': ['DSA', 'DBMS', 'Operating Systems', 'Computer Networks', 'OOP', 'System Design'],
  'Cloud / DevOps': ['Docker', 'Kubernetes', 'AWS', 'CI/CD (GitHub Actions)', 'Linux', 'Git', 'Vercel'],
  'AI / ML': ['Python', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'NumPy', 'OpenAI API'],
  'Mobile': ['React Native', 'Flutter', 'Android (Java/Kotlin)', 'iOS (Swift)']
};

export const MISTAKES_LIST = [
  'Started DSA too late', 'Ignored core CS subjects', 'Did too many tutorials without building',
  "Didn't build strong projects", "Didn't practice contests", 'Applied too late in placement season',
  "Didn't revise enough", 'Something else'
];

export const START_EARLIER_LIST = [
  'DSA', 'Development', 'Projects', 'Internships', 'Core CS',
  'Competitive programming', 'Communication & English', 'Networking on LinkedIn', 'Other'
];

export const RESOURCE_CATEGORIES = [
  'YouTube', 'DSA Sheet', 'Course', 'Books', 'Test Series',
  'College Seniors', 'Friends', 'Documentation', 'Communities', 'Other'
];

export const DSA_SHEETS = [
  'Striver A2Z DSA Sheet', 'Love Babbar 450 Sheet', 'NeetCode 150',
  'LeetCode Top Interview 150', 'GFG 160 Practice Sheet', 'Fraz DSA Sheet', 'Other'
];

export const YOUTUBE_CHANNELS = [
  'Take U Forward (Striver)', 'Kunal Kushwaha', 'Chai aur Code', 'CodeWithHarry',
  'Abdul Bari', 'Gate Smashers', 'Jenny’s Lectures', 'Love Babbar', 'Other'
];

// 1. Detected Answer Card (Newbert already knows, asks to confirm)
export function DetectedAnswerCard({ label, value, source = 'your profile', onConfirm, onEdit }) {
  return (
    <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-5 mb-5">
      <div className="flex items-center gap-2 text-xs font-bold text-orange-400 mb-2">
        <Sparkles size={15} />
        <span>FOUND FROM {source.toUpperCase()}</span>
      </div>
      <p className="text-sm text-slate-300 mb-1">{label}</p>
      <p className="text-lg font-bold text-white mb-4">{typeof value === 'object' ? value.name || JSON.stringify(value) : String(value)}</p>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onConfirm} className="ac-primary !min-h-[38px] !py-2 !px-4 text-xs font-bold">
          <Check size={14} /> Yes, use this
        </button>
        <button type="button" onClick={onEdit} className="text-xs text-slate-400 hover:text-white font-medium underline underline-offset-4">
          Change
        </button>
      </div>
    </div>
  );
}

// 2. Quick Choice (Large buttons / chips with optional "Other" fallback)
export function QuickChoice({ options = [], value, onChange, allowOther = true, columns = 'auto' }) {
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState('');

  const handleSelect = (opt) => {
    if (opt === 'Other' || opt === 'Something else') {
      setShowOther(true);
    } else {
      setShowOther(false);
      onChange(opt);
    }
  };

  const handleOtherSubmit = (e) => {
    e.preventDefault();
    if (otherText.trim()) {
      onChange(otherText.trim());
    }
  };

  const isValueInOptions = options.some(o => (typeof o === 'string' ? o : o.value) === value);
  const isCustomValue = value && !isValueInOptions;

  return (
    <div className="space-y-3">
      <div className={`grid gap-2.5 ${columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : columns === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'flex flex-wrap'}`}>
        {options.map((opt) => {
          const optVal = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          const selected = value === optVal;
          return (
            <button
              type="button"
              key={optVal}
              onClick={() => handleSelect(optVal)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all text-left flex items-center justify-between border ${
                selected
                  ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-sm'
                  : 'border-slate-700/70 bg-slate-800/60 text-slate-200 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              <span>{optLabel}</span>
              {selected && <Check size={16} className="text-orange-400 shrink-0 ml-2" />}
            </button>
          );
        })}
        {allowOther && !options.includes('Other') && (
          <button
            type="button"
            onClick={() => setShowOther(!showOther)}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all text-left border ${
              showOther || isCustomValue
                ? 'border-orange-500/80 bg-orange-500/10 text-orange-400'
                : 'border-dashed border-slate-600 bg-slate-800/30 text-slate-400 hover:text-slate-200 hover:border-slate-500'
            }`}
          >
            + Enter manually
          </button>
        )}
      </div>

      {(showOther || isCustomValue) && (
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
            placeholder="Type your answer..."
            value={otherText || (isCustomValue ? value : '')}
            onChange={(e) => setOtherText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleOtherSubmit(e);
              }
            }}
          />
          <button
            type="button"
            onClick={handleOtherSubmit}
            className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-black hover:bg-orange-400"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

// 3. Multi-Select Chips
export function MultiChipSelect({ options = [], value = [], onChange, allowCustom = true, customPlaceholder = '+ Add other' }) {
  const [customInput, setCustomInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  const toggle = (item) => {
    const list = Array.isArray(value) ? value : [];
    if (list.includes(item)) {
      onChange(list.filter(x => x !== item));
    } else {
      onChange([...list, item]);
    }
  };

  const addCustom = (e) => {
    e?.preventDefault();
    const clean = customInput.trim();
    if (clean && !(value || []).includes(clean)) {
      onChange([...(Array.isArray(value) ? value : []), clean]);
      setCustomInput('');
      setShowInput(false);
    }
  };

  const list = Array.isArray(value) ? value : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = list.includes(opt);
          return (
            <button
              type="button"
              key={opt}
              onClick={() => toggle(opt)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                selected
                  ? 'border-orange-500 bg-orange-500/20 text-orange-400 font-bold'
                  : 'border-slate-700/80 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              {selected && <Check size={13} className="text-orange-400" />}
              <span>{opt}</span>
            </button>
          );
        })}
        {allowCustom && (
          showInput ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCustom(e); }}
                placeholder="Type name..."
                className="rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:outline-none"
              />
              <button type="button" onClick={addCustom} className="rounded bg-orange-500 px-2 py-1 text-xs font-bold text-black">Add</button>
              <button type="button" onClick={() => setShowInput(false)} className="text-xs text-slate-400 hover:text-white px-1">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowInput(true)}
              className="rounded-lg border border-dashed border-slate-600 bg-slate-800/30 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:border-slate-400"
            >
              {customPlaceholder}
            </button>
          )
        )}
      </div>
      {list.length > 0 && (
        <p className="text-xs text-slate-400">
          <span className="text-orange-400 font-bold">{list.length}</span> selected
        </p>
      )}
    </div>
  );
}

// 4. Range Selector (For CTC, solved DSA, prep duration)
export function RangeSelector({ ranges = [], value, onChange, unit = '', exactPrompt = 'Enter exact number' }) {
  const [showExact, setShowExact] = useState(false);
  const [exactVal, setExactVal] = useState('');

  const handleSelect = (r) => {
    setShowExact(false);
    onChange(r.numericValue);
  };

  const handleExact = (e) => {
    e.preventDefault();
    const num = parseFloat(exactVal);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {ranges.map((r) => {
          const selected = value === r.numericValue;
          return (
            <button
              type="button"
              key={r.label}
              onClick={() => handleSelect(r)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all text-center border ${
                selected
                  ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                  : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              {r.label} {unit}
            </button>
          );
        })}
      </div>

      <div className="pt-1">
        {showExact ? (
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              placeholder={`Exact ${unit}...`}
              value={exactVal}
              onChange={(e) => setExactVal(e.target.value)}
            />
            <button type="button" onClick={handleExact} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-black">
              Set
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowExact(true)}
            className="text-xs text-slate-400 hover:text-orange-400 underline underline-offset-4"
          >
            {exactPrompt}
          </button>
        )}
      </div>
    </div>
  );
}

// 5. Skill Selector (Category-First + Level Selection)
export function CategorySkillSelector({ value = [], onChange, detectedSkills = [] }) {
  const [activeCategory, setActiveCategory] = useState('Frontend');
  const [customSkill, setCustomSkill] = useState('');

  const currentSkills = Array.isArray(value) ? value : [];

  const isSelected = (skillName) => currentSkills.some(s => (s.name || s).toLowerCase() === skillName.toLowerCase());

  const toggleSkill = (skillName, category) => {
    if (isSelected(skillName)) {
      onChange(currentSkills.filter(s => (s.name || s).toLowerCase() !== skillName.toLowerCase()));
    } else {
      onChange([...currentSkills, { name: skillName, category: category ? category.toUpperCase().replace(/\s+/g, '_') : 'OTHER', level: 'INTERMEDIATE' }]);
    }
  };

  const changeLevel = (skillName, newLevel) => {
    onChange(currentSkills.map(s => {
      if ((s.name || s).toLowerCase() === skillName.toLowerCase()) {
        return typeof s === 'string' ? { name: s, level: newLevel, category: 'OTHER' } : { ...s, level: newLevel };
      }
      return s;
    }));
  };

  const addCustom = (e) => {
    e?.preventDefault();
    if (customSkill.trim() && !isSelected(customSkill.trim())) {
      toggleSkill(customSkill.trim(), activeCategory);
      setCustomSkill('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Object.keys(SKILL_CATEGORIES).map((cat) => (
          <button
            type="button"
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-all border ${
              activeCategory === cat
                ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Suggested Skills in Selected Category */}
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/30 p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Popular {activeCategory} Skills
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {(SKILL_CATEGORIES[activeCategory] || []).map((skill) => {
            const selected = isSelected(skill);
            const isDetected = detectedSkills.some(ds => (ds.name || ds).toLowerCase() === skill.toLowerCase());
            return (
              <button
                type="button"
                key={skill}
                onClick={() => toggleSkill(skill, activeCategory)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all border flex items-center gap-1.5 ${
                  selected
                    ? 'border-orange-500 bg-orange-500/20 text-orange-400 font-bold'
                    : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                {selected && <Check size={13} className="text-orange-400" />}
                <span>{skill}</span>
                {isDetected && !selected && <span className="text-[10px] text-green-400 bg-green-500/20 px-1 rounded">GitHub</span>}
              </button>
            );
          })}
        </div>

        {/* Custom skill input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={`+ Add another ${activeCategory} skill...`}
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCustom(e); }}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none"
          />
          <button type="button" onClick={addCustom} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-600">
            Add
          </button>
        </div>
      </div>

      {/* Selected Skills with Level Adjuster */}
      {currentSkills.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Your Selected Skills ({currentSkills.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {currentSkills.map((s) => {
              const name = typeof s === 'string' ? s : s.name;
              const level = (typeof s === 'object' && s.level) || 'INTERMEDIATE';
              return (
                <div key={name} className="flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-800/70 px-3 py-2 text-xs">
                  <span className="font-bold text-white truncate mr-2">{name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((lvl) => (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() => changeLevel(name, lvl)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          level === lvl
                            ? lvl === 'ADVANCED' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : lvl === 'INTERMEDIATE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-slate-600 text-slate-200'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {lvl.slice(0, 3)}
                      </button>
                    ))}
                    <button type="button" onClick={() => toggleSkill(name)} className="text-slate-500 hover:text-red-400 ml-1 p-0.5">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// 6. Project Selector from Detected GitHub Repositories
export function GithubProjectPicker({ value = [], onChange, repositories = [] }) {
  const [manualMode, setManualMode] = useState(false);
  const [manualProject, setManualProject] = useState({ name: '', description: '', techStack: [], onResume: true, discussedInInterview: false });

  const selectedProjects = Array.isArray(value) ? value : [];

  const isRepoSelected = (repoName) => selectedProjects.some(p => p.name?.toLowerCase() === repoName.toLowerCase());

  const toggleRepo = (repo) => {
    if (isRepoSelected(repo.name)) {
      onChange(selectedProjects.filter(p => p.name?.toLowerCase() !== repo.name.toLowerCase()));
    } else {
      const newProj = {
        name: repo.name,
        description: repo.description || '',
        techStack: repo.language ? [repo.language] : [],
        githubUrl: repo.url || `https://github.com/${repo.fullName || repo.name}`,
        liveUrl: repo.homepage || '',
        onResume: true,
        discussedInInterview: false,
        source: 'GITHUB'
      };
      onChange([...selectedProjects, newProj]);
    }
  };

  const updateSelectedProject = (index, updates) => {
    const next = [...selectedProjects];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const addManual = (e) => {
    e.preventDefault();
    if (manualProject.name.trim()) {
      onChange([...selectedProjects, { ...manualProject, source: 'MANUAL' }]);
      setManualProject({ name: '', description: '', techStack: [], onResume: true, discussedInInterview: false });
      setManualMode(false);
    }
  };

  return (
    <div className="space-y-4">
      {repositories.length > 0 ? (
        <div>
          <p className="text-xs font-bold text-orange-400 mb-2 flex items-center gap-1.5">
            <Sparkles size={14} /> FOUND {repositories.length} GITHUB REPOSITORIES — SELECT THE ONES FOR YOUR JOURNEY:
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 max-h-80 overflow-y-auto pr-1">
            {repositories.map((repo) => {
              const selected = isRepoSelected(repo.name);
              return (
                <div
                  key={repo.name}
                  onClick={() => toggleRepo(repo)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    selected
                      ? 'border-orange-500 bg-orange-500/15 shadow-sm'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white truncate">{repo.name}</h4>
                    <span className={`h-5 w-5 rounded-md flex items-center justify-center border ${selected ? 'bg-orange-500 border-orange-500 text-black' : 'border-slate-600'}`}>
                      {selected && <Check size={14} className="stroke-[3]" />}
                    </span>
                  </div>
                  {repo.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{repo.description}</p>}
                  {repo.language && <span className="inline-block mt-2 rounded bg-purple-500/20 text-purple-300 px-2 py-0.5 text-[10px] font-bold">{repo.language}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">No public GitHub repositories automatically detected. You can add projects manually.</p>
      )}

      {/* Selected projects configuration (Resume? Interview?) */}
      {selectedProjects.length > 0 && (
        <div className="space-y-3 pt-2">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Configure Selected Projects ({selectedProjects.length})</p>
          {selectedProjects.map((p, idx) => (
            <div key={p.name || idx} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-sm text-white">{p.name}</strong>
                <button type="button" onClick={() => onChange(selectedProjects.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:underline">
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={p.onResume !== false}
                    onChange={(e) => updateSelectedProject(idx, { onResume: e.target.checked })}
                    className="rounded border-slate-600 accent-orange-500"
                  />
                  <span>On your placement resume?</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={p.discussedInInterview === true}
                    onChange={(e) => updateSelectedProject(idx, { discussedInInterview: e.target.checked })}
                    className="rounded border-slate-600 accent-orange-500"
                  />
                  <span>Discussed in interview?</span>
                </label>
              </div>

              {p.discussedInInterview && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-bold text-slate-400">What topics did they ask about this project?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Authentication', 'Database Schema', 'API Design', 'Deployment', 'Scaling / Performance', 'State Management', 'Architecture'].map(topic => (
                      <button
                        type="button"
                        key={topic}
                        onClick={() => {
                          const current = (p.interviewQuestions || '').split(',').map(s => s.trim()).filter(Boolean);
                          const next = current.includes(topic) ? current.filter(t => t !== topic) : [...current, topic];
                          updateSelectedProject(idx, { interviewQuestions: next.join(', ') });
                        }}
                        className={`rounded px-2 py-1 text-[11px] font-semibold border ${
                          (p.interviewQuestions || '').includes(topic)
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                            : 'bg-slate-700/50 text-slate-300 border-slate-600'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Manual Add Button & Form */}
      <div>
        {manualMode ? (
          <form onSubmit={addManual} className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
            <h4 className="text-sm font-bold text-white">Add Project Manually</h4>
            <input
              type="text"
              placeholder="Project Name *"
              required
              value={manualProject.name}
              onChange={(e) => setManualProject({ ...manualProject, name: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white"
            />
            <textarea
              placeholder="What did this project do? What problem did it solve?"
              rows={2}
              value={manualProject.description}
              onChange={(e) => setManualProject({ ...manualProject, description: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="GitHub URL (optional)"
              value={manualProject.githubUrl || ''}
              onChange={(e) => setManualProject({ ...manualProject, githubUrl: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setManualMode(false)} className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" className="rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-bold text-black">Save Project</button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="rounded-xl border border-dashed border-slate-600 bg-slate-800/30 w-full py-3 text-xs font-bold text-slate-400 hover:text-orange-400 hover:border-orange-500 transition-colors"
          >
            + Add a project manually
          </button>
        )}
      </div>
    </div>
  );
}

// 7. Privacy Preset Cards
export function PrivacyPresets({ value = {}, onChange, privacyFields = [] }) {
  const [mode, setMode] = useState('preset');

  const applyPreset = (preset) => {
    const updated = { ...value };
    if (preset === 'RECOMMENDED') {
      privacyFields.forEach(f => {
        if (/(?:ctc|baseSalary|stipend)/i.test(f.key)) updated[f.key] = 'COLLEGE_ONLY';
        else if (/(?:email|phone|verification)/i.test(f.key)) updated[f.key] = 'PRIVATE';
        else updated[f.key] = 'PUBLIC';
      });
    } else if (preset === 'PUBLIC') {
      privacyFields.forEach(f => {
        if (/(?:email|phone|verification)/i.test(f.key)) updated[f.key] = 'PRIVATE';
        else updated[f.key] = 'PUBLIC';
      });
    } else if (preset === 'PRIVATE') {
      privacyFields.forEach(f => {
        if (/(?:name|college|branch|graduationYear)/i.test(f.key)) updated[f.key] = 'COLLEGE_ONLY';
        else updated[f.key] = 'PRIVATE';
      });
    }
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {mode === 'preset' ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div
            onClick={() => applyPreset('RECOMMENDED')}
            className="cursor-pointer rounded-xl border border-orange-500/60 bg-orange-500/10 p-4 transition hover:bg-orange-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-orange-400 uppercase tracking-wider">Recommended ⭐</span>
            </div>
            <h4 className="font-bold text-sm text-white mb-2">Balanced Transparency</h4>
            <ul className="text-xs space-y-1 text-slate-300">
              <li>• Journey & skills: <strong>Public</strong></li>
              <li>• Package & CTC: <strong>College Only</strong></li>
              <li>• Contact & email: <strong>Private</strong></li>
            </ul>
          </div>

          <div
            onClick={() => applyPreset('PUBLIC')}
            className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:border-slate-500"
          >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Open</span>
            <h4 className="font-bold text-sm text-white mb-2">Mostly Public</h4>
            <p className="text-xs text-slate-400">Help the widest student audience learn from your complete preparation.</p>
          </div>

          <div
            onClick={() => applyPreset('PRIVATE')}
            className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:border-slate-500"
          >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Restricted</span>
            <h4 className="font-bold text-sm text-white mb-2">Mostly Private</h4>
            <p className="text-xs text-slate-400">Share journey strictly with students from your own recognized college.</p>
          </div>
        </div>
      ) : null}

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => setMode(mode === 'preset' ? 'custom' : 'preset')}
          className="text-xs text-slate-400 hover:text-orange-400 underline underline-offset-4"
        >
          {mode === 'preset' ? 'Customize field by field →' : '← Back to quick presets'}
        </button>
      </div>
    </div>
  );
}
