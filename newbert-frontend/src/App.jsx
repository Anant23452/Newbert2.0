import Navbar from './components/Navbar';
import Routing from './Routing';
import { ThemeContext } from './Context/ThemeContext';
import './brand.css';
import AuthModal from './components/AuthModel';
import ProfileSyncStatus from './components/ProfileSyncStatus';
import ActivityRefresh from './components/ActivityRefresh';

import { useEffect, useState } from 'react';




function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('newbert-theme') || 'night');
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('newbert-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(current => current === 'day' ? 'night' : 'day') }}><div className="app-shell">
      <ActivityRefresh/>
      <Navbar onSignIn={() => setAuthOpen(true)}/>
      <ProfileSyncStatus/>
      <Routing/>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onExplore={() => window.scrollTo({ top: 0, behavior: 'smooth' })}/>
    </div></ThemeContext.Provider>
  )
}

export default App
