import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Code2, Github, TrendingUp } from "lucide-react";
import { activityWeek } from "../utils/todayActivity";

export default function TodayMomentum({ profile }) {
  const days = activityWeek(profile.activityCalendar);
  const [selected, setSelected] = useState("");
  const day = days.find((item) => item.key === selected) || days[6];
  const active = days.filter((item) => item.total > 0).length;
  const max = Math.max(1, ...days.map((item) => item.total));
  const githubConnected = Boolean(profile.connections?.github?.connected || profile.githubStats);
  const leetcodeConnected = Boolean(profile.connections?.leetcode?.connected || profile.leetcodeStats);
  return <section className="today-momentum" aria-label="Your activity week"><div className="today-section-heading"><h2><TrendingUp size={19}/>Your rhythm</h2><Link to="/profile">History <ArrowRight size={15}/></Link></div><div className="today-rhythm-heading"><strong>{active}<span>/ 7 days</span></strong><p>{active >= 5 ? "You kept showing up this week." : active > 0 ? "You have a starting point. Build on it." : "Your next small step can start here."}</p></div>
    <div className="today-week" role="group" aria-label="Activity in the last seven days">{days.map((item) => <button key={item.key} onClick={() => setSelected(item.key)} aria-pressed={day.key === item.key} aria-label={`${item.dateLabel}: ${item.total} recorded coding activities`}><span className="today-bar-track"><span className={item.total ? "today-bar active" : "today-bar"} style={{ height: `${Math.max(6, item.total / max * 100)}%` }}/></span><span>{item.label}</span><small>{item.dateLabel.split(" ")[0]}</small></button>)}</div>
    <div className="today-day-detail" aria-live="polite"><div className="today-day-title"><strong>{day.key === days[6].key ? "Today" : day.dateLabel}</strong><span>Asia/Kolkata</span></div><dl><div><dt><Github size={15}/>GitHub commits</dt><dd>{githubConnected || day.github ? day.github : "Not connected"}</dd></div><div><dt><Code2 size={15}/>LeetCode accepted*</dt><dd>{leetcodeConnected || day.leetcode ? day.leetcode : "Not connected"}</dd></div></dl><p className="today-muted">{!day.recorded ? "No coding activity recorded for this day. " : ""}*Accepted problems recorded by your integration, not necessarily first-time solves.</p></div>
    <p className="today-sync-time">{profile.lastSyncedAt ? `Last synced ${new Date(profile.lastSyncedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} IST` : "Connect an account in your profile to bring in activity."}</p>
  </section>;
}
