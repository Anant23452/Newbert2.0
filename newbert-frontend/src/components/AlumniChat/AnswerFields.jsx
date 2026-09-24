import { useState, useEffect } from 'react';
import CollegeAutocomplete from '../CollegeAutocomplete';
import {
  QuickChoice,
  MultiChipSelect,
  RangeSelector,
  CategorySkillSelector,
  GithubProjectPicker,
  PrivacyPresets,
  TOP_COMPANIES,
  TOP_ROLES,
  DSA_LANGUAGES,
  DSA_TOPICS_LIST,
  CORE_CS_LIST,
  MISTAKES_LIST,
  START_EARLIER_LIST,
  RESOURCE_CATEGORIES,
  DSA_SHEETS,
  YOUTUBE_CHANNELS
} from './OptionComponents';

const collections = ['skills', 'projects', 'internships', 'interview-rounds', 'timeline', 'resource-list', 'collection'];

const labelOf = (option) => (typeof option === 'string' ? option.replaceAll('_', ' ') : option.label);
const valueOf = (option) => (typeof option === 'string' ? option : option.value);

export function formatAnswer(value) {
  if (value === null || value === undefined) return 'Not shared';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None';
    if (typeof value[0] === 'object' && value[0]?.name) return value.map(v => v.name).join(', ');
    return value.map(formatAnswer).join(' · ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, v]) => `${key.replace(/([A-Z])/g, ' $1')}: ${formatAnswer(v)}`)
      .join('\n');
  }
  return String(value);
}

export function AnswerValue({ value }) {
  if (Array.isArray(value)) {
    return (
      <div className="ac-value-list">
        {value.map((v, i) => (
          <div key={i}>
            <AnswerValue value={v} />
          </div>
        ))}
      </div>
    );
  }
  if (value && typeof value === 'object') {
    return (
      <dl className="ac-facts">
        {Object.entries(value)
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ')}</dt>
              <dd>
                <AnswerValue value={v} />
              </dd>
            </div>
          ))}
      </dl>
    );
  }
  if (typeof value === 'string' && /^https?:\/\//.test(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer">
        {value} ↗
      </a>
    );
  }
  return <span>{formatAnswer(value)}</span>;
}

export default function AnswerFields({
  field,
  value,
  onChange,
  privacyFields = [],
  repositories = [],
  detectedSkills = []
}) {
  const fid = field.id;

  // 1. Projects - GitHub Repository Picker
  if (field.type === 'projects' || fid === 'projects') {
    return (
      <GithubProjectPicker
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        repositories={repositories}
      />
    );
  }

  // 2. Skills at Selection - Category First Chips
  if (field.type === 'skills' || fid === 'skillsAtSelection') {
    return (
      <CategorySkillSelector
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        detectedSkills={detectedSkills}
      />
    );
  }

  // 3. Privacy Presets
  if (field.type === 'privacy') {
    return (
      <PrivacyPresets
        fields={privacyFields}
        value={value || {}}
        onChange={onChange}
        privacyFields={privacyFields}
      />
    );
  }

  // 4. College Autocomplete
  if (field.type === 'college') {
    return (
      <div className="space-y-3">
        <CollegeAutocomplete
          value={value?.name || ''}
          selectedCollege={value?.collegeId ? value : null}
          onQueryChange={(name) => onChange({ name })}
          onSelect={(college) => onChange({ collegeId: college.collegeId || college._id, name: college.name })}
        />
      </div>
    );
  }

  // 5. Specific text fields with high-probability suggestions
  if (fid === 'branch') {
    const branches = [
      'Computer Science and Engineering',
      'Information Technology',
      'Electronics and Communication Engineering',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Civil Engineering'
    ];
    return <QuickChoice options={branches} value={value} onChange={onChange} allowOther={true} />;
  }

  if (fid === 'graduationYear') {
    const currentYear = new Date().getFullYear();
    const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
    return <QuickChoice options={years.map(String)} value={value ? String(value) : ''} onChange={(v) => onChange(Number(v))} allowOther={true} />;
  }

  if (fid === 'degree') {
    const degrees = ['B.Tech', 'B.E.', 'BCA', 'MCA', 'M.Tech', 'B.Sc'];
    return <QuickChoice options={degrees} value={value} onChange={onChange} allowOther={true} />;
  }

  if (fid === 'primaryLanguage') {
    return <QuickChoice options={DSA_LANGUAGES} value={value} onChange={onChange} allowOther={true} />;
  }

  if (fid === 'company') {
    return <QuickChoice options={TOP_COMPANIES} value={value} onChange={onChange} allowOther={true} />;
  }

  if (fid === 'role') {
    return <QuickChoice options={TOP_ROLES} value={value} onChange={onChange} allowOther={true} />;
  }

  if (fid === 'startedIn') {
    const starts = [
      { value: 'YEAR_1', label: '1st Year' },
      { value: 'YEAR_2', label: '2nd Year' },
      { value: 'YEAR_3', label: '3rd Year' },
      { value: 'FINAL_YEAR', label: 'Final Year' },
      { value: 'AFTER_GRADUATION', label: 'After Graduation' }
    ];
    return <QuickChoice options={starts} value={value} onChange={onChange} allowOther={false} />;
  }

  if (fid === 'months') {
    const ranges = [
      { label: '< 3 months', numericValue: 2 },
      { label: '3–6 months', numericValue: 4 },
      { label: '6–9 months', numericValue: 7 },
      { label: '9–12 months', numericValue: 10 },
      { label: '1+ year', numericValue: 14 }
    ];
    return <RangeSelector ranges={ranges} value={value} onChange={onChange} unit="" exactPrompt="Enter exact number of months" />;
  }

  if (fid === 'hoursPerDay') {
    const ranges = [
      { label: '< 1 hr/day', numericValue: 1 },
      { label: '1–2 hrs/day', numericValue: 2 },
      { label: '2–3 hrs/day', numericValue: 2.5 },
      { label: '3–4 hrs/day', numericValue: 3.5 },
      { label: '4+ hrs/day', numericValue: 5 },
      { label: 'Varied a lot', numericValue: 3 }
    ];
    return <RangeSelector ranges={ranges} value={value} onChange={onChange} unit="" exactPrompt="Enter exact average hours/day" />;
  }

  if (fid === 'solvedAtSelection') {
    const ranges = [
      { label: '100–200', numericValue: 150 },
      { label: '200–300', numericValue: 250 },
      { label: '300–400', numericValue: 350 },
      { label: '400–500', numericValue: 450 },
      { label: '500+', numericValue: 550 }
    ];
    return <RangeSelector ranges={ranges} value={value} onChange={onChange} unit="problems" exactPrompt="Enter approximate number" />;
  }

  if (fid === 'ctc' || fid === 'baseSalary') {
    const ranges = [
      { label: '< 4 LPA', numericValue: 3.5 },
      { label: '4–6 LPA', numericValue: 5 },
      { label: '6–10 LPA', numericValue: 8 },
      { label: '10–15 LPA', numericValue: 12 },
      { label: '15–25 LPA', numericValue: 20 },
      { label: '25+ LPA', numericValue: 30 }
    ];
    return <RangeSelector ranges={ranges} value={value} onChange={onChange} unit="" exactPrompt="Enter exact LPA" />;
  }

  if (fid === 'strongTopics' || fid === 'weakTopics') {
    return <MultiChipSelect options={DSA_TOPICS_LIST} value={value || []} onChange={onChange} customPlaceholder="+ Add other topic" />;
  }

  if (fid === 'biggestMistake') {
    return <QuickChoice options={MISTAKES_LIST} value={value} onChange={onChange} allowOther={true} />;
  }

  if (fid === 'startEarlier') {
    return <QuickChoice options={START_EARLIER_LIST} value={value} onChange={onChange} allowOther={true} />;
  }

  // 6. Generic Choice or Yes/No
  if (field.type === 'choice' || field.type === 'yes-no') {
    const options = field.type === 'yes-no'
      ? [{ value: true, label: 'Yes' }, { value: false, label: 'No' }]
      : (field.options || []).map(o => (typeof o === 'string' ? { value: o, label: o.replaceAll('_', ' ') } : o));
    return (
      <QuickChoice
        options={options}
        value={value}
        onChange={onChange}
        allowOther={Boolean(field.allowOther)}
      />
    );
  }

  // 7. Multi-choice and Platform Selector
  if (field.type === 'multi-choice' || field.type === 'platform-selector') {
    const options = (field.options || []).map(o => (typeof o === 'string' ? o.replaceAll('_', ' ') : o.label || o.value));
    return (
      <MultiChipSelect
        options={options}
        value={Array.isArray(value) ? value.map(v => (typeof v === 'string' ? v.replaceAll('_', ' ') : v)) : []}
        onChange={(list) => {
          // Normalize back if options had underscores
          const normalized = list.map(item => {
            const match = (field.options || []).find(o => (typeof o === 'string' ? o.replaceAll('_', ' ') : o.label) === item);
            return match ? (typeof match === 'string' ? match : match.value) : item;
          });
          onChange(normalized);
        }}
      />
    );
  }

  // 8. Collections (internships, interview-rounds, etc.)
  if (collections.includes(field.type)) {
    return (
      <CollectionInput
        field={field}
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
      />
    );
  }

  // 9. Structured Object Input
  if (field.type === 'object') {
    return (
      <ObjectInput
        field={field}
        value={value || {}}
        onChange={onChange}
      />
    );
  }

  // 10. Long Textarea
  if (field.type === 'textarea') {
    return (
      <textarea
        aria-label={field.label || field.text}
        rows={4}
        maxLength={field.maxLength || 3000}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tell it in your own words..."
      />
    );
  }

  // 11. Default Input
  return (
    <input
      aria-label={field.label || field.text}
      type={['number', 'year', 'rating'].includes(field.type) ? 'number' : field.type === 'date' ? 'date' : 'text'}
      inputMode={['number', 'year', 'rating'].includes(field.type) ? 'decimal' : field.type === 'url' ? 'url' : undefined}
      min={field.min}
      max={field.max}
      step="any"
      maxLength={field.maxLength || 2048}
      value={value ?? ''}
      placeholder={field.type === 'url' ? 'https://...' : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function CollectionInput({ field, value, onChange }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  const fields = field.fields || [];
  const current = fields[step];

  const begin = (index) => {
    setEditing(index);
    setDraft(index < value.length ? value[index] : {});
    setStep(0);
    setError('');
  };

  function finish() {
    if (fields.some((f) => f.required && (draft[f.id] === undefined || draft[f.id] === '' || (Array.isArray(draft[f.id]) && !draft[f.id].length)))) {
      setError('Complete the required details before keeping this entry.');
      return;
    }
    const items = [...value];
    items[editing] = draft;
    onChange(items);
    setEditing(null);
    setDraft({});
  }

  function next() {
    if (current.required && (draft[current.id] === undefined || draft[current.id] === '' || (Array.isArray(draft[current.id]) && !draft[current.id].length))) {
      setError('Add this detail before continuing.');
      return;
    }
    setError('');
    if (step < fields.length - 1) {
      setStep(step + 1);
      return;
    }
    const items = [...value];
    items[editing] = draft;
    onChange(items);
    setEditing(null);
    setDraft({});
  }

  return (
    <div className="ac-collection">
      {value.map((item, i) => (
        <article key={i}>
          <div>
            <b>{item.name || item.company || item.title || item.platformLabel || `Entry ${i + 1}`}</b>
            <small>{item.role || item.description || item.duration || (item.techStack && item.techStack.join(', '))}</small>
          </div>
          <button type="button" onClick={() => begin(i)}>
            Edit
          </button>
          <button type="button" onClick={() => onChange(value.filter((_, j) => i !== j))} aria-label={`Remove entry ${i + 1}`}>
            Remove
          </button>
        </article>
      ))}

      {editing === null ? (
        <button className="ac-secondary w-full justify-center !py-3 font-bold" type="button" onClick={() => begin(value.length)}>
          + Add {value.length ? 'another' : 'an entry'}
        </button>
      ) : (
        <div className="ac-entry mt-4">
          <p className="ac-kicker">
            ENTRY {editing + 1} · DETAIL {step + 1} OF {fields.length}
          </p>
          <h3>
            {current.label}
            {current.required ? ' *' : ''}
          </h3>
          <AnswerFields
            key={`${editing}:${step}`}
            field={current}
            value={draft[current.id]}
            onChange={(v) => setDraft({ ...draft, [current.id]: v })}
          />
          {error && <p role="alert" className="text-red-400 text-xs mt-2">{error}</p>}
          <div className="ac-actions">
            <button type="button" onClick={() => setEditing(null)}>
              Cancel
            </button>
            {step < fields.length - 1 && (
              <button type="button" onClick={finish}>
                Keep entry now
              </button>
            )}
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)}>
                Previous
              </button>
            )}
            <button className="ac-primary" type="button" onClick={next}>
              {step === fields.length - 1 ? 'Save entry' : 'Next detail'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ObjectInput({ field, value, onChange }) {
  const fields = field.fields || [];
  const primary = fields.some((f) => f.required) ? fields.filter((f) => f.required) : fields.slice(0, 4);
  const more = fields.filter((f) => !primary.includes(f));

  const renderField = (child) => (
    <div key={child.id} className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-300">
        {child.label}
        {child.required ? ' *' : ''}
      </label>
      <AnswerFields
        field={child}
        value={value[child.id]}
        onChange={(v) => onChange({ ...value, [child.id]: v })}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {primary.map(renderField)}
      </div>
      {more.length > 0 && (
        <details className="ac-more pt-2">
          <summary className="text-xs text-orange-400 font-bold cursor-pointer hover:underline">
            More details (optional)
          </summary>
          <div className="space-y-4 pt-3">
            {more.map(renderField)}
          </div>
        </details>
      )}
    </div>
  );
}
