import type { Metadata } from "next";
import { QueryProvider } from "./query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hacker News",
  description: "A modern Hacker News client built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
