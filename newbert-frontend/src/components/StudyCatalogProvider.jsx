import { useCallback, useEffect, useRef, useState } from 'react';
import API from '../Services/api';
import { setManagedStudyContent } from '../data/academicStudy';
import { StudyCatalogContext } from '../hook/useStudyCatalog';
import useAuth from '../hook/useAuth';
export default function StudyCatalogProvider({ children }) {
  const {isAuthenticated}=useAuth();
  const requestVersion=useRef(0);
  const [state, setState] = useState({ loading: true, error: '' });
  const refresh = useCallback(async () => {
    const version=++requestVersion.current;
    setState(s => ({ ...s, loading: true, error: '' }));
    try { const { data } = await API.get('/study/catalog'); if(version!==requestVersion.current)return; setManagedStudyContent(data); setState({ loading: false, error: '' }); }
    catch { if(version===requestVersion.current)setState({ loading: false, error: 'New lessons could not be loaded. Existing lectures remain available.' }); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh,isAuthenticated]);
  return <StudyCatalogContext.Provider value={{ ...state, refresh }}>{children}</StudyCatalogContext.Provider>;
}
