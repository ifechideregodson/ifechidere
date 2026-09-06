import type { Metadata } from "next"; import "./globals.css"; import "./market-workspace.css";
export const metadata: Metadata = { title: "Market | Ditrine", description: "An open marketplace for goods and services." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }