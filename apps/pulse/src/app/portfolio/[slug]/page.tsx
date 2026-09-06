import Link from "next/link";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10000";
const apiUrl = configuredApiUrl.startsWith("http") ? configuredApiUrl : `https://${configuredApiUrl}`;
type Portfolio = { title: string; slug: string; bio?: string; owner_name: string; updated_at: string; items: { id: string; title: string; description?: string; assetUrl?: string }[] };

async function getPortfolio(slug: string): Promise<Portfolio | null> {
  const response = await fetch(`${apiUrl}/v1/portfolios/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
  return response.ok ? response.json() : null;
}

export default async function HostedPortfolio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portfolio = await getPortfolio(slug);
  if (!portfolio) return <main className="hosted-portfolio"><Link href="/">← Back to Pulse</Link><h1>Portfolio not found.</h1><p>This portfolio may be private or the link may be out of date.</p></main>;
  return <main className="hosted-portfolio"><header><Link className="brand" href="/">Ditrine <b>/ Pulse</b></Link><Link href="/">Back to Pulse ↗</Link></header><section className="portfolio-intro"><small>Hosted portfolio</small><h1>{portfolio.title}</h1><p className="portfolio-owner">By {portfolio.owner_name}</p>{portfolio.bio && <p>{portfolio.bio}</p>}</section><section className="portfolio-items">{portfolio.items.length ? portfolio.items.map((item) => <article key={item.id}><small>Selected work</small><h2>{item.title}</h2>{item.description && <p>{item.description}</p>}{item.assetUrl && <a href={item.assetUrl} download target="_blank" rel="noreferrer">Open or download asset ↗</a>}</article>) : <p>No portfolio items have been published yet.</p>}</section><footer>Hosted on Ditrine Pulse · Updated {new Date(portfolio.updated_at).toLocaleDateString()}</footer></main>;
}