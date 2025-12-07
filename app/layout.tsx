import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Multimodal Ranking Platform",
  description: "Test, compare, and rank AI model responses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
