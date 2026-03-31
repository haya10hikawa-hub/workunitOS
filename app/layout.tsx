import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Editor",
  description: "Signal-to-execution workspace for editorial work units",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
