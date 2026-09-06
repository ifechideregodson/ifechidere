"use client";

import { FormEvent, useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.startsWith("http") ? process.env.NEXT_PUBLIC_API_URL : process.env.NEXT_PUBLIC_API_URL ? `https://${process.env.NEXT_PUBLIC_API_URL}` : "http://localhost:10000";
type Video = { id: string; title: string; description?: string; video_url: string; channel_name: string; view_count: number };

export default function StreamWorkspace() {
  const [token, setToken] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [channelName, setChannelName] = useState("");
  const [channelSlug, setChannelSlug] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [channelId, setChannelId] = useState("");
  const [message, setMessage] = useState("Watch published videos or connect to create a channel.");

  useEffect(() => { setToken(window.localStorage.getItem("ditrine_access_token") ?? ""); void loadVideos(); }, []);
  async function loadVideos() { const response = await fetch(`${apiUrl}/v1/videos`); if (response.ok) setVideos(await response.json()); }
  function saveToken(event: FormEvent<HTMLFormElement>) { event.preventDefault(); window.localStorage.setItem("ditrine_access_token", token); setMessage("Account connected."); }
  async function createChannel(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const response = await fetch(`${apiUrl}/v1/channels`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: channelName, slug: channelSlug }) }); if (response.ok) { const channel = await response.json(); setChannelId(channel.id); setMessage("Channel created."); } else setMessage("Channel could not be created."); }
  async function publishVideo(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const response = await fetch(`${apiUrl}/v1/videos`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ channelId, title: videoTitle, videoUrl }) }); setMessage(response.ok ? "Video published." : "Video could not be published."); if (response.ok) { setVideoTitle(""); setVideoUrl(""); void loadVideos(); } }
  async function recordView(videoId: string) { await fetch(`${apiUrl}/v1/videos/${videoId}/views`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ watchSeconds: 1 }) }); }

  return <section className="stream-workspace"><div className="workspace-heading"><div><small>Watch and publish</small><h2>Ideas in<br /><i>motion.</i></h2></div><form onSubmit={saveToken} className="token-form"><label htmlFor="stream-token">Access token</label><input id="stream-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste verified JWT" /><button type="submit">Connect</button></form></div><p className="stream-message">{message}</p><div className="video-grid">{videos.length ? videos.map((video) => <article key={video.id}><video controls preload="metadata" src={video.video_url} onPlay={() => void recordView(video.id)} /><small>{video.channel_name} · {video.view_count} views</small><h3>{video.title}</h3><a href={video.video_url} download target="_blank" rel="noreferrer">Download ↗</a></article>) : <p className="empty-stream">No published videos yet.</p>}</div><div className="creator-tools"><form onSubmit={createChannel}><small>Create a channel</small><input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Channel name" required /><input value={channelSlug} onChange={(event) => setChannelSlug(event.target.value)} placeholder="channel-slug" required /><button type="submit" disabled={!token}>Create channel</button></form><form onSubmit={publishVideo}><small>Publish a short video</small><input value={channelId} onChange={(event) => setChannelId(event.target.value)} placeholder="Channel ID" required /><input value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} placeholder="Video title" required /><input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://storage.example/video.mp4" type="url" required /><button type="submit" disabled={!token}>Publish video</button></form></div></section>;
}