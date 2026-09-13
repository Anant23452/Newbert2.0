import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useAuth from '../hook/useAuth';
import { ACTIVITY_CHANGED, PROFILE_POLL_MS } from '../utils/activityRefresh';

export default function ActivityRefresh() {
  const { refreshActivity, isAuthenticated } = useAuth();
  const {pathname}=useLocation();
  useEffect(()=>{if(isAuthenticated)void refreshActivity?.();},[pathname,isAuthenticated,refreshActivity]);
  useEffect(()=>{
    if(!isAuthenticated || !refreshActivity)return undefined;
    const refresh=()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)void refreshActivity();};
    let pending;
    const changed=()=>{clearTimeout(pending);pending=setTimeout(()=>void refreshActivity({changed:true}),800);};
    document.addEventListener('visibilitychange',refresh);
    window.addEventListener('focus',refresh);
    window.addEventListener('online',refresh);
    window.addEventListener(ACTIVITY_CHANGED,changed);
    const interval=setInterval(refresh,PROFILE_POLL_MS);
    return ()=>{clearInterval(interval);clearTimeout(pending);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener(ACTIVITY_CHANGED,changed);};
  },[isAuthenticated,refreshActivity]);
  return null;
}
