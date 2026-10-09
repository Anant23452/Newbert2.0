const { youtubeId, invalid } = require('./studyContentService');
async function fetchVideo(value, fetcher = fetch, key = process.env.YOUTUBE_API_KEY) {
  const videoId = youtubeId(value);
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  if (key) {
    const params = new URLSearchParams({part:'snippet,contentDetails,status',id:videoId,key});
    const response = await fetcher(`https://www.googleapis.com/youtube/v3/videos?${params}`, {signal:AbortSignal.timeout(12000)});
    if (!response.ok) invalid('YouTube details could not be fetched. Check the API key or retry later.');
    const item = (await response.json()).items?.[0];
    if (!item || item.status?.embeddable === false || item.status?.privacyStatus === 'private') invalid('This video is unavailable or does not allow embedding.');
    const duration = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(item.contentDetails?.duration || '');
    const minutes = duration ? Math.ceil(Number(duration[1] || 0)*60+Number(duration[2] || 0)+Number(duration[3] || 0)/60) : 0;
    return {videoId,url,title:item.snippet.title,summary:(item.snippet.description || '').slice(0,4000),mentorName:item.snippet.channelTitle,minutes,thumbnail:`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,notice:''};
  }
  const response = await fetcher(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {signal:AbortSignal.timeout(12000)});
  if (!response.ok) invalid('This video could not be imported. Check that it is available on YouTube.');
  const data = await response.json();
  return {videoId,url,title:data.title,mentorName:data.author_name,summary:'',minutes:0,thumbnail:`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,notice:'Title and thumbnail imported. Add duration and summary manually, or configure YOUTUBE_API_KEY for richer metadata.'};
}
module.exports = { fetchVideo };
