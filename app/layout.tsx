import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scaler AI Persona",
  description: "Live AI persona system for Scaler AI Engineer Intern screening",
};

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

import { Sidebar } from "@/components/sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-[#09090b] text-zinc-100 selection:bg-zinc-800 flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </body>
    </html>
  );
}
