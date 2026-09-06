import type { Metadata } from "next"; import "./globals.css"; import "./control-ops.css"; import "./control-admin.css";
export const metadata: Metadata = { title: "Control | Ditrine", description: "Ditrine executive operations workspace." };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }