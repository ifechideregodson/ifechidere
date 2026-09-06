import type { Metadata } from "next"; import "./globals.css"; import "./supply-workspace.css";
export const metadata: Metadata = { title: "Supply | Ditrine", description: "The official Ditrine store." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }