export function pdfPreviewUrl(resource) {
  let url; try { url=new URL(resource.url); } catch { return null; }
  if(url.protocol!=='https:' || url.username || url.password) return null;
  if(url.hostname==='drive.google.com') {
    const id=/^\/file\/d\/([\w-]+)/.exec(url.pathname)?.[1] || url.searchParams.get('id');
    return /^[\w-]+$/.test(id || '') ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  if(resource.format==='pdf' || /\.pdf$/i.test(url.pathname)) return url.href;
  return null;
}
