import { useCallback, useEffect, useState } from 'react';
import API from '../Services/api';
import { setManagedStudyContent } from '../data/academicStudy';
import { StudyCatalogContext } from '../hook/useStudyCatalog';
export default function StudyCatalogProvider({ children }) {
  const [state, setState] = useState({ loading: true, error: '' });
  const refresh = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: '' }));
    try { const { data } = await API.get('/study/catalog'); setManagedStudyContent(data); setState({ loading: false, error: '' }); }
    catch { setState({ loading: false, error: 'New lessons could not be loaded. Existing lectures remain available.' }); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return <StudyCatalogContext.Provider value={{ ...state, refresh }}>{children}</StudyCatalogContext.Provider>;
}
