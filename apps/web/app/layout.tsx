import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";

export const metadata: Metadata = {
  title: "Hacker Reader - A Beautiful Hacker News Client",
  description:
    "A beautiful, native mobile experience for Hacker News. Browse stories, read comments, and stay up to date with the tech community. Built with React Native and Expo.",
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
    "Android",
  ],
  authors: [{ name: "Hacker Reader Team" }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  openGraph: {
    title: "Hacker Reader - A Beautiful Hacker News Client",
    description:
      "A beautiful, native mobile experience for Hacker News. Browse stories, read comments, and stay up to date with the tech community.",
    type: "website",
    siteName: "Hacker Reader",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hacker Reader - A Beautiful Hacker News Client",
    description:
      "A beautiful, native mobile experience for Hacker News. Browse stories, read comments, and stay up to date with the tech community.",
    creator: "@hackerreader",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
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
      </body>
    </html>
  );
}
