import type { Metadata } from "next";
import { AppProvider } from "@/context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codex Draft",
  description: "Halı saha maçları için akıllı takım kurucu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-zinc-950 font-sans">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
