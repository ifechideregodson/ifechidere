import type { Metadata } from "next"; import "./globals.css"; import "./pulse-workspace.css";
export const metadata: Metadata = { title: "Pulse | Ditrine", description: "The professional network for work in motion." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }