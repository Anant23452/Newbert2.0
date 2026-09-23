import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import CollegeAutocomplete from '../components/CollegeAutocomplete';
import useAuth from '../hook/useAuth';
import '../alumni-chat.css';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear + 8 - 1950 + 1 }, (_, index) => currentYear + 8 - index);

export default function JoinNewbert() {
  const { profile, loading, saveProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [year, setYear] = useState(profile?.graduationYear || '');
  const [college, setCollege] = useState(profile?.selectedCollege || null);
  const [query, setQuery] = useState(profile?.college || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.graduationYear) setYear(profile.graduationYear);
    if (profile?.selectedCollege?._id) setCollege(profile.selectedCollege);
    if (profile?.college) setQuery(profile.college);
  }, [profile?.graduationYear, profile?.selectedCollege, profile?.college]);

  if (loading) return <main className="alumni-chat-page"><p className="ac-loading">Preparing your Newbert space…</p></main>;
  if (!profile) return <main className="alumni-chat-page"><div className="ac-shell ac-welcome"><h1>Join Newbert</h1><p>Create an account to save your student progress.</p><Link className="ac-primary" to="/">Go to Newbert</Link></div></main>;

  async function submit(event) {
    event.preventDefault();
    if (!college?._id || !year) { setError('Choose your college and class year to continue.'); return; }
    setSaving(true); setError('');
    try {
      const saved = await saveProfile({ collegeId: college._id, graduationYear: Number(year) });
      if (!saved) throw new Error('Your account changed. Please sign in again.');
      const returnTo = location.state?.returnTo;
      if (saved.memberType === 'SENIOR') navigate('/alumni/onboarding', { replace: true });
      else navigate(returnTo?.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\') && !['/join', '/complete-profile'].includes(returnTo) ? returnTo : '/', { replace: true });
    } catch (err) { setError(err.response?.data?.message || err.message || 'Could not save your class and college.'); }
    finally { setSaving(false); }
  }

  return <main className="alumni-chat-page"><div className="ac-shell">
    <p className="ac-kicker">WELCOME TO NEWBERT</p>
    <section className="ac-welcome"><h1>Just two details.<br/><em>Then you’re in.</em></h1><p>Your class year helps us open the right Newbert experience. Your college connects you to relevant seniors, resources and students.</p></section>
    <form onSubmit={submit} className="join-card">
      <label htmlFor="join-year">What is your class of?</label>
      <select id="join-year" value={year} onChange={event => setYear(event.target.value)} required><option value="">Select your class year</option>{years.map(value => <option key={value} value={value}>Class of {value}</option>)}</select>
      <CollegeAutocomplete value={query} selectedCollege={college} onQueryChange={value => { setQuery(value); setCollege(null); }} onSelect={selected => { setCollege(selected); setQuery(selected.name); setError(''); }}/>
      {error && <p role="alert" className="join-error">{error}</p>}
      <button className="ac-primary" type="submit" disabled={saving || !year || !college?._id}>{saving ? 'Saving your place…' : 'Continue to Newbert →'}</button>
      <p>That is all you need to start. You can add skills, goals and public profiles later.</p>
    </form>
  </div></main>;
}
