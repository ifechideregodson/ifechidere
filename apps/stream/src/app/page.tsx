import StreamWorkspace from "./stream-workspace";

const pulseUrl = process.env.NEXT_PUBLIC_PULSE_URL ?? "http://localhost:3001";
const marketUrl = process.env.NEXT_PUBLIC_MARKET_URL ?? "http://localhost:3002";
const supplyUrl = process.env.NEXT_PUBLIC_SUPPLY_URL ?? "http://localhost:3003";
const controlUrl = process.env.NEXT_PUBLIC_CONTROL_URL ?? "http://localhost:3005";
const cards = [["Continue watching", "The future of local trade · 14:08", "Resume"], ["Your channel", "1,248 people are watching your work.", "Open studio"], ["For you", "New voices and useful ideas to discover.", "Explore feed"]];
export default function Stream() { return <main className="site stream"><header><a className="brand" href="/">Ditrine <b>/ Stream</b></a><nav><a href={pulseUrl}>Pulse</a><a href={marketUrl}>Market</a><a href={supplyUrl}>Supply</a><a href={controlUrl}>Control</a></nav><span className="avatar">AM</span></header><section className="hero"><div><small>04 / VIDEO PLATFORM</small><h1>Stories in <i>motion.</i></h1><p>Watch, upload, and grow a channel for ideas that deserve more than a passing glance.</p><button>Explore the feed <span>↗</span></button></div><div className="orb">▶</div></section><section className="grid">{cards.map(([title, text, action]) => <article key={title}><small>{title}</small><h2>{text}</h2><a href="#">{action} ↗</a></article>)}</section><StreamWorkspace /></main>; }