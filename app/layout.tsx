import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scaler AI Persona",
  description: "Live AI persona system for Scaler AI Engineer Intern screening",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
