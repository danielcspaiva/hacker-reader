import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";

import "./globals.css";
import { ThemeProvider } from "./theme-provider";

export const metadata: Metadata = {
  title: "Hacker Reader - Hacker News, like it deserves",
  description:
    "A calm, native Hacker News reader for iPhone: white cards on warm grey and a warm charcoal Dark Mode, serif story pages, easy-to-follow threads, and Home and Lock Screen widgets. Free and open source.",
  keywords: [
    "Hacker News",
    "Hacker Reader",
    "HN",
    "HN Client",
    "mobile app",
    "React Native",
    "Expo",
    "tech news",
    "programming",
    "iOS",
    "iPhone",
    "widgets",
  ],
  authors: [{ name: "Daniel Paiva", url: "https://dcsp.dev/en" }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  openGraph: {
    title: "Hacker Reader - Hacker News, like it deserves",
    description:
      "A calm, native Hacker News reader for iPhone, with serif story pages, easy-to-follow threads and widgets. Free and open source.",
    type: "website",
    siteName: "Hacker Reader",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hacker Reader - Hacker News, like it deserves",
    description:
      "A calm, native Hacker News reader for iPhone, with serif story pages, easy-to-follow threads and widgets. Free and open source.",
    creator: "@hackerreader",
  },
  icons: {
    icon: "/ios-light.png",
    apple: "/ios-light.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
