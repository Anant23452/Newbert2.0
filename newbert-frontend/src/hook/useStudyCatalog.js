import { createContext, useContext } from 'react';
export const StudyCatalogContext = createContext({ loading: true, error: '', refresh: () => {} });
export default function useStudyCatalog() { return useContext(StudyCatalogContext); }
