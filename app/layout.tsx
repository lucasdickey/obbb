import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://ob3.chat"),
  title: "OB3.chat - One Big Beautiful Bill Act Assistant",
  description:
    "Ask questions about the 2025 House Resolution 1 (One Big Beautiful Bill Act) using AI-powered semantic search. Get instant answers about tax relief, border security, energy policy, healthcare, and more.",
  keywords: [
    "HR1",
    "One Big Beautiful Bill",
    "2025",
    "House Resolution",
    "AI assistant",
    "semantic search",
    "legislation",
  ],
  authors: [{ name: "OB3.chat Team" }],
  openGraph: {
    title: "OB3.chat - One Big Beautiful Bill Act Assistant",
    description:
      "Ask questions about the 2025 House Resolution 1 using AI-powered semantic search",
    url: "https://ob3.chat",
    siteName: "OB3.chat",
    images: [
      {
        url: "/images/initial-landing-image.png",
        width: 1200,
        height: 630,
        alt: "One Big Beautiful Bill - HR1 2025 Chat Assistant",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OB3.chat - One Big Beautiful Bill Act Assistant",
    description:
      "Ask questions about the 2025 House Resolution 1 using AI-powered semantic search",
    images: ["/images/initial-landing-image.png"],
    creator: "@ob3chat",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
