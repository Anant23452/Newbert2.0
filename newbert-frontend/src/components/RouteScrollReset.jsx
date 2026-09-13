import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Inside Suspense: run after the destination content is ready, including lazy routes.
export default function RouteScrollReset() {
  const {pathname,search,hash}=useLocation();
  useLayoutEffect(()=>{
    const previous=window.history.scrollRestoration;
    window.history.scrollRestoration='manual';
    return ()=>{window.history.scrollRestoration=previous;};
  },[]);
  useLayoutEffect(()=>{
    if(hash){
      let id;try{id=decodeURIComponent(hash.slice(1));}catch{id='';}
      const target=document.getElementById(id);
      if(target){target.scrollIntoView({behavior:'instant',block:'start'});return;}
    }
    window.scrollTo({top:0,left:0,behavior:'instant'});
  },[pathname,search,hash]);
  return null;
}
