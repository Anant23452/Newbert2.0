import Navbar from './Components/Navbar';
import Routing from './Routing';
import { useEffect, useState } from 'react';




function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('newbert-theme') || 'day');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('newbert-theme', theme);
  }, [theme]);

  return (
    <>
    <Navbar theme={theme} onThemeToggle={() => setTheme((current) => current === 'day' ? 'night' : 'day')}/>
    <Routing/>
   
    
    </>
  )
}

export default App
