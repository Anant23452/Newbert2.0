import Navbar from './components/Navbar';
import Routing from './Routing';
import { ThemeContext } from './Context/ThemeContext';
import './brand.css';
import './member-light.css';
import './public-home.css';
import useAuth from './hook/useAuth';
import AuthModal from './components/AuthModel';
import ProfileSyncStatus from './components/ProfileSyncStatus';
import ActivityRefresh from './components/ActivityRefresh';

import { useEffect, useState } from 'react';




function App() {
  const { isAuthenticated } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('newbert-theme') || 'night');
  const [authOpen, setAuthOpen] = useState(false);
  const [authReturn,setAuthReturn]=useState(null);
  useEffect(()=>{const open=()=>{setAuthReturn(window.location.pathname+window.location.search);setAuthOpen(true);};window.addEventListener("newbert-notes-sign-in",open);return()=>window.removeEventListener("newbert-notes-sign-in",open);},[]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('newbert-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(current => current === 'day' ? 'night' : 'day') }}><div className={`app-shell${isAuthenticated ? ' member-shell' : ''}`}>
      <ActivityRefresh/>
      <Navbar onSignIn={() => {setAuthReturn(null);setAuthOpen(true);}}/>
      <ProfileSyncStatus/>
      <Routing/>
      <AuthModal returnTo={authReturn} isOpen={authOpen} onClose={() => setAuthOpen(false)} onExplore={() => window.scrollTo({ top: 0, behavior: 'smooth' })}/>
    </div></ThemeContext.Provider>
  )
}

export default App
