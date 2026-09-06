import MarketWorkspace from "./market-workspace";

const publicUrl = (value: string | undefined, fallback: string) => value?.startsWith("http") ? value : value ? `https://${value}` : fallback;

const pulseUrl = publicUrl(process.env.NEXT_PUBLIC_PULSE_URL, "http://localhost:3001");
const supplyUrl = publicUrl(process.env.NEXT_PUBLIC_SUPPLY_URL, "http://localhost:3003");
const streamUrl = publicUrl(process.env.NEXT_PUBLIC_STREAM_URL, "http://localhost:3004");
const controlUrl = publicUrl(process.env.NEXT_PUBLIC_CONTROL_URL, "http://localhost:3005");
const cards = [["Explore", "Browse goods, services, and digital assets.", "See listings"], ["Watchlist", "3 offers are saved for your next move.", "Open watchlist"], ["Sell", "Put your next thing in front of the right people.", "Create listing"]];
export default function Market() { return <main className="site market"><header><a className="brand" href="/">Ditrine <b>/ Market</b></a><nav><a href={pulseUrl}>Pulse</a><a href={supplyUrl}>Supply</a><a href={streamUrl}>Stream</a><a href={controlUrl}>Control</a></nav><span className="avatar">AM</span></header><section className="hero"><div><small>02 / OPEN MARKETPLACE</small><h1>Trade with <i>possibility.</i></h1><p>A trusted open market for goods, services, and digital assets, built around clear offers and human connection.</p><button>Browse the market <span>↗</span></button></div><div className="orb">M</div></section><section className="grid">{cards.map(([title, text, action]) => <article key={title}><small>{title}</small><h2>{text}</h2><a href="#">{action} ↗</a></article>)}</section><MarketWorkspace /></main>; }