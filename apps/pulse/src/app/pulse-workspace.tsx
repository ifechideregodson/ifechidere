"use client";

import { FormEvent, useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10000";
type Post = { id: string; body: string; display_name: string; created_at: string };

function PulseWorkspace() {
  const [token, setToken] = useState("");
  const [body, setBody] = useState("");
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioSlug, setPortfolioSlug] = useState("");
  const [portfolioBio, setPortfolioBio] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [message, setMessage] = useState("Add your access token to load your workspace.");

  useEffect(() => { setToken(window.localStorage.getItem("ditrine_access_token") ?? ""); }, []);
  useEffect(() => { if (token) void loadPosts(); }, [token]);

  async function loadPosts() {
    const response = await fetch(`${apiUrl}/v1/posts`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) { setMessage("Your session could not be verified."); return; }
    setPosts(await response.json()); setMessage("");
  }

  function saveToken(event: FormEvent<HTMLFormElement>) { event.preventDefault(); window.localStorage.setItem("ditrine_access_token", token); setMessage("Access token saved."); void loadPosts(); }
  async function publish(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!body.trim()) return; const response = await fetch(`${apiUrl}/v1/posts`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ body }) }); if (!response.ok) { setMessage("The post could not be published."); return; } setBody(""); setMessage("Published."); void loadPosts(); }
  async function createPortfolio(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const response = await fetch(`${apiUrl}/v1/portfolios`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ title: portfolioTitle, slug: portfolioSlug, bio: portfolioBio, isPublished: true }) }); setMessage(response.ok ? "Portfolio hosted publicly." : "The portfolio could not be created."); }

  return <section className="pulse-workspace"><div className="workspace-heading"><div><small>Live workspace</small><h2>Put your work<br /><i>in motion.</i></h2></div><form onSubmit={saveToken} className="token-form"><label htmlFor="pulse-token">Access token</label><input id="pulse-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste verified JWT" /><button type="submit">Connect</button></form></div><div className="workspace-columns"><form className="composer" onSubmit={publish}><small>New update</small><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} placeholder="What are you working on?" disabled={!token} /><div><span>{message}</span><button type="submit" disabled={!token || !body.trim()}>Publish ↗</button></div></form><div className="feed"><small>Recent updates</small>{posts.length ? posts.map((post) => <article key={post.id}><strong>{post.display_name}</strong><p>{post.body}</p><small>{new Date(post.created_at).toLocaleDateString()}</small></article>) : <p className="empty-feed">Connect your account to see the latest updates.</p>}</div></div><form className="portfolio-form" onSubmit={createPortfolio}><small>Host a portfolio</small><input value={portfolioTitle} onChange={(event) => setPortfolioTitle(event.target.value)} placeholder="Portfolio title" required /><input value={portfolioSlug} onChange={(event) => setPortfolioSlug(event.target.value)} placeholder="your-public-slug" required /><textarea value={portfolioBio} onChange={(event) => setPortfolioBio(event.target.value)} placeholder="A short introduction" /><button type="submit" disabled={!token}>Create portfolio ↗</button></form></section>;
}

export default PulseWorkspace;