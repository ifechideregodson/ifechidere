import SupplyWorkspace from "./supply-workspace";

const publicUrl = (value: string | undefined, fallback: string) => value?.startsWith("http") ? value : value ? `https://${value}` : fallback;

const pulseUrl = publicUrl(process.env.NEXT_PUBLIC_PULSE_URL, "http://localhost:3001");
const marketUrl = publicUrl(process.env.NEXT_PUBLIC_MARKET_URL, "http://localhost:3002");
const streamUrl = publicUrl(process.env.NEXT_PUBLIC_STREAM_URL, "http://localhost:3004");
const controlUrl = publicUrl(process.env.NEXT_PUBLIC_CONTROL_URL, "http://localhost:3005");
const cards = [["Collection", "Tools and objects designed for making.", "Shop collection"], ["Order DT-2048", "Your latest order is in transit.", "Track order"], ["Basket", "2 items are ready for checkout.", "View basket"]];
export default function Supply() { return <main className="site supply"><header><a className="brand" href="/">Ditrine <b>/ Supply</b></a><nav><a href={pulseUrl}>Pulse</a><a href={marketUrl}>Market</a><a href={streamUrl}>Stream</a><a href={controlUrl}>Control</a></nav><span className="avatar">AM</span></header><section className="hero"><div><small>03 / DITRINE STORE</small><h1>Good things, <i>delivered.</i></h1><p>Shop the official Ditrine collection with simple checkout, transparent delivery, and support that stays close.</p><button>Shop collection <span>↗</span></button></div><div className="orb">S</div></section><section className="grid">{cards.map(([title, text, action]) => <article key={title}><small>{title}</small><h2>{text}</h2><a href="#">{action} ↗</a></article>)}</section><SupplyWorkspace /></main>; }