import type { Metadata } from "next"; import "./globals.css"; import "./stream-workspace.css";
export const metadata: Metadata = { title: "Stream | Ditrine", description: "Watch and publish stories in motion." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }