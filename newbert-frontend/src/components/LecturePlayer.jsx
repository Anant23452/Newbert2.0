import { useEffect, useRef, useState } from "react";
import { ExternalLink, Pause, Play, RotateCcw } from "lucide-react";
import { timeLabel } from "../utils/studyTools";

let apiPromise;//
function youtubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { apiPromise = undefined; reject(new Error("Player connection timed out")); }, 15000);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timeout); previous?.(); resolve(window.YT); };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; script.async = true;
      script.onerror = () => { clearTimeout(timeout); apiPromise = undefined; script.remove(); reject(new Error("Player unavailable")); };
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

export default function LecturePlayer({ videoId, title, initialSeconds = 0, onProgress, onTime, controller }) {
  const host = useRef(null);
  const player = useRef(null);
  const handlers = useRef({ onProgress, onTime });
  handlers.current = { onProgress, onTime };
  const [start] = useState(initialSeconds);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [time, setTime] = useState(start);
  const [loop, setLoop] = useState(false);
  const loopStart = useRef(0);
  const looping = useRef(false);
  useEffect(() => {
    let active = true;
    let interval;
    let readyTimeout;
    let tick = 0;
    setReady(false); setError("");
    looping.current = false; setLoop(false);
    const mount = document.createElement("div"); host.current.replaceChildren(mount);
    youtubeApi().then((YT) => {
      if (!active) return;
      readyTimeout = setTimeout(() => {
        if (active) setError("The embedded player is taking too long to connect. Retry, or open the lecture on YouTube and keep your notebook here.");
      }, 20000);
      player.current = new YT.Player(mount, { videoId, width: "100%", height: "100%", host: "https://www.youtube-nocookie.com",
        playerVars: { origin: window.location.origin, start: Math.floor(start), playsinline: 1, rel: 0 },
        events: {
          onReady: (event) => {
            if (!active) return;
            clearTimeout(readyTimeout); setError("");
            event.target.getIframe().title = title;
            setReady(true);
            controller.current = { seek: (seconds) => { looping.current = false; setLoop(false); event.target.seekTo(seconds, true); event.target.playVideo(); }, pause: () => event.target.pauseVideo(), time: () => event.target.getCurrentTime() };
            interval = setInterval(() => {
              const p = player.current;
              if (!p?.getCurrentTime) return;
              const seconds = p.getCurrentTime(); const duration = p.getDuration();
              setTime(seconds); handlers.current.onTime?.(seconds);
              if (looping.current && seconds >= loopStart.current + 30) p.seekTo(loopStart.current, true);
              if (p.getPlayerState() === 1 && ++tick % 15 === 0) handlers.current.onProgress?.({ positionSeconds: seconds, durationSeconds: duration });
            }, 1000);
          },
          onStateChange: (event) => {
            if (!active || ![0, 1, 2].includes(event.data)) return;
            handlers.current.onProgress?.({ positionSeconds: event.target.getCurrentTime(), durationSeconds: event.target.getDuration() });
          },
          onError: () => { clearTimeout(readyTimeout); if (active) { setReady(false); controller.current = null; setError("This lecture could not play here. Open it on YouTube, or retry the player."); } },
        },
      });
    }).catch(() => { if (active) setError("YouTube could not connect. Your notes and recall tools are still available."); });
    return () => { active = false; clearTimeout(readyTimeout); clearInterval(interval); controller.current = null; player.current?.destroy?.(); player.current = null; };
  }, [videoId, title, start, retry, controller]);
  const toggleLoop = () => {
    const next = !looping.current; looping.current = next; setLoop(next);
    if (next) { loopStart.current = Math.max(0, player.current.getCurrentTime() - 30); player.current.seekTo(loopStart.current, true); player.current.playVideo(); }
  };
  return <section className="studio-player" aria-label="Lecture player">
    <div className="studio-video" ref={host}/>
    {error ? <div className="studio-player-message" role="alert"><p>{error}</p><button onClick={() => setRetry((n) => n + 1)}>Retry player</button></div> : !ready && <p className="studio-player-message" role="status">Connecting to YouTube…</p>}
    <div className="studio-player-tools"><span>{timeLabel(time)}</span><button disabled={!ready} onClick={() => player.current.pauseVideo()}><Pause size={14}/>Pause to think</button><button disabled={!ready} aria-pressed={loop} onClick={toggleLoop}><RotateCcw size={14}/>{loop ? "Stop 30s loop" : "Loop last 30s"}</button><button disabled={!ready} onClick={() => player.current.playVideo()}><Play size={14}/>Play</button><a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">YouTube <ExternalLink size={13}/></a></div>
    {loop && <p className="studio-loop-status" role="status">Repeating {timeLabel(loopStart.current)}–{timeLabel(loopStart.current + 30)}. Stop the loop when the idea clicks.</p>}
  </section>;
}
