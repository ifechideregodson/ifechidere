"use client";

import { FormEvent, useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10000";
type Listing = { id: string; title: string; description: string; listing_type: string; price_cents: number; currency: string; seller_name: string };

export default function MarketWorkspace() {
  const [token, setToken] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("Listings are available to everyone. Connect to sell or buy.");

  useEffect(() => { setToken(window.localStorage.getItem("ditrine_access_token") ?? ""); void loadListings(); }, []);
  async function loadListings() { const response = await fetch(`${apiUrl}/v1/listings`); if (response.ok) setListings(await response.json()); }
  function saveToken(event: FormEvent<HTMLFormElement>) { event.preventDefault(); window.localStorage.setItem("ditrine_access_token", token); setMessage("Account connected."); }
  async function createListing(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const response = await fetch(`${apiUrl}/v1/listings`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ title, description, priceCents: Math.round(Number(price) * 100) }) }); setMessage(response.ok ? "Listing published." : "Listing could not be published."); if (response.ok) { setTitle(""); setDescription(""); setPrice(""); void loadListings(); } }
  async function placeOrder(listingId: string) { const response = await fetch(`${apiUrl}/v1/orders`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ listingId, quantity: 1 }) }); setMessage(response.ok ? "Order created. Payment can be completed through the configured provider." : "Connect your account before ordering."); }

  return <section className="market-workspace"><div className="workspace-heading"><div><small>Open market</small><h2>Find the next<br /><i>good exchange.</i></h2></div><form onSubmit={saveToken} className="token-form"><label htmlFor="market-token">Access token</label><input id="market-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste verified JWT" /><button type="submit">Connect</button></form></div><p className="market-message">{message}</p><div className="listing-grid">{listings.length ? listings.map((listing) => <article key={listing.id}><small>{listing.listing_type} · {listing.seller_name}</small><h3>{listing.title}</h3><p>{listing.description}</p><strong>${(listing.price_cents / 100).toFixed(2)} {listing.currency}</strong><button onClick={() => placeOrder(listing.id)} disabled={!token}>Order ↗</button></article>) : <p className="empty-market">No published listings yet.</p>}</div><form className="listing-form" onSubmit={createListing}><small>Sell something</small><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Listing title" required /><input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price in USD" type="number" min="0" step="0.01" required /><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the goods or service" required /><button type="submit" disabled={!token}>Publish listing ↗</button></form></section>;
}