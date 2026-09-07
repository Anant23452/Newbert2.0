import Navbar from './components/Navbar';
import Routing from './Routing';
import AuthModal from './components/AuthModel';
import ProfileSyncStatus from './components/ProfileSyncStatus';

import { useEffect, useState } from 'react';




function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('newbert-theme') || 'night');
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('newbert-theme', theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <Navbar theme={theme} onThemeToggle={() => setTheme((current) => current === 'day' ? 'night' : 'day')} onSignIn={() => setAuthOpen(true)}/>
      <ProfileSyncStatus/>
      <Routing/>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onExplore={() => window.scrollTo({ top: 0, behavior: 'smooth' })}/>
    </div>
  )
}

export default App
