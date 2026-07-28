import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://slopcheck.dev";

/** Stable absolute OG asset — X/Twitter often chokes on Next's hashed image routes. */
const shareImage = {
  url: `${siteUrl}/brand/og.png?v=20260728`,
  width: 1200,
  height: 630,
  alt: "Slopcheck — comic blob sniffing a website for AI slop",
  type: "image/png",
} as const;

export const siteMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Slopcheck — Is your UI AI slop?",
    template: "%s · Slopcheck",
  },
  description:
    "Paste a URL. We score whether your website UI looks like AI slop — and help you fix it with copy-paste prompts.",
  applicationName: "Slopcheck",
  keywords: [
    "AI slop",
    "UI audit",
    "website design",
    "AI generated UI",
    "design review",
    "Slopcheck",
  ],
  authors: [{ name: "Domenic Wehkamp" }],
  creator: "Slopcheck",
  publisher: "Slopcheck",
  category: "design",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Slopcheck",
    title: "Slopcheck — Is your UI AI slop?",
    description:
      "Paste a URL. We sniff AI-looking UI, score the slop, and unlock fix prompts.",
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slopcheck — Is your UI AI slop?",
    description:
      "Paste a URL. We sniff AI-looking UI, score the slop, and unlock fix prompts.",
    images: [shareImage.url],
  },
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    shortcut: ["/brand/favicon.ico"],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
};
