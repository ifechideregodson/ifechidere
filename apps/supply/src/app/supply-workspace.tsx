"use client";

import { FormEvent, useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10000";
type Product = { id: string; sku: string; name: string; description: string; price_cents: number; inventory_count: number };

export default function SupplyWorkspace() {
  const [token, setToken] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orderId, setOrderId] = useState("");
  const [shipment, setShipment] = useState<{ status: string; carrier?: string; tracking_number?: string } | null>(null);
  const [message, setMessage] = useState("Browse the official collection. Connect to order.");

  useEffect(() => { setToken(window.localStorage.getItem("ditrine_access_token") ?? ""); void loadProducts(); }, []);
  async function loadProducts() { const response = await fetch(`${apiUrl}/v1/products`); if (response.ok) setProducts(await response.json()); }
  function saveToken(event: FormEvent<HTMLFormElement>) { event.preventDefault(); window.localStorage.setItem("ditrine_access_token", token); setMessage("Account connected."); }
  async function buy(productId: string) { const response = await fetch(`${apiUrl}/v1/store-orders`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity: 1 }) }); if (!response.ok) { setMessage("Connect your account or check product availability."); return; } const order = await response.json(); setOrderId(order.id); setMessage("Order created and sent to fulfillment."); void loadProducts(); }
  async function track(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const response = await fetch(`${apiUrl}/v1/orders/${orderId}/shipment`, { headers: { Authorization: `Bearer ${token}` } }); if (response.ok) setShipment(await response.json()); else setMessage("Shipment not found for this account."); }

  return <section className="supply-workspace"><div className="workspace-heading"><div><small>Official collection</small><h2>Made for<br /><i>the next move.</i></h2></div><form onSubmit={saveToken} className="token-form"><label htmlFor="supply-token">Access token</label><input id="supply-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste verified JWT" /><button type="submit">Connect</button></form></div><p className="supply-message">{message}</p><div className="product-grid">{products.length ? products.map((product) => <article key={product.id}><small>{product.sku} · {product.inventory_count} available</small><h3>{product.name}</h3><p>{product.description}</p><strong>${(product.price_cents / 100).toFixed(2)} USD</strong><button onClick={() => buy(product.id)} disabled={!token}>Buy now ↗</button></article>) : <p className="empty-supply">The collection is being prepared.</p>}</div><form className="tracking-form" onSubmit={track}><small>Track an order</small><input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Order ID" required /><button type="submit" disabled={!token}>Check shipment</button>{shipment && <span>{shipment.status}{shipment.tracking_number ? ` · ${shipment.tracking_number}` : ""}</span>}</form></section>;
}