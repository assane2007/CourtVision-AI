import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f1a" },
  ],
};

export const metadata: Metadata = {
  title: "CourtVision AI — AI Basketball Coaching & Form Analysis",
  description:
    "Revolutionary AI-powered basketball coaching app. Real-time pose estimation, personalized training plans, form analysis, and predictive insights. Used by 50,000+ players worldwide.",
  keywords:
    "basketball coaching, AI training, basketball form analysis, shot tracking, basketball drills, AI coach, basketball workout",
  authors: [{ name: "CourtVision AI" }],
  creator: "CourtVision AI",
  publisher: "CourtVision AI",
  metadataBase: new URL("https://courtvision.ai"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CourtVision AI",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  robots: "index, follow",
  openGraph: {
    title: "CourtVision AI — AI Basketball Coaching & Form Analysis",
    description:
      "Revolutionary AI-powered basketball coaching app. Real-time pose estimation, personalized training plans, form analysis, and predictive insights. Used by 50,000+ players worldwide.",
    type: "website",
    url: "https://courtvision.ai",
    siteName: "CourtVision AI",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CourtVision AI — AI-powered basketball coaching app showing real-time pose estimation and form analysis on a mobile device",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CourtVision AI — AI Basketball Coaching & Form Analysis",
    description:
      "Revolutionary AI-powered basketball coaching app. Real-time pose estimation, personalized training plans, form analysis, and predictive insights. Used by 50,000+ players worldwide.",
  },
  alternates: {
    languages: {
      fr: "https://courtvision.ai/fr",
      en: "https://courtvision.ai",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* JSON-LD: SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "CourtVision AI",
              applicationCategory: "SportsApplication",
              operatingSystem: "Web, iOS, Android",
              description:
                "Revolutionary AI-powered basketball coaching app. Real-time pose estimation, personalized training plans, form analysis, and predictive insights. Used by 50,000+ players worldwide.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "EUR",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "12450",
              },
            }),
          }}
        />
        {/* JSON-LD: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "CourtVision AI",
              url: "https://courtvision.ai",
              logo: "https://courtvision.ai/icon-512.png",
              sameAs: [
                "https://twitter.com/courtvisionai",
                "https://instagram.com/courtvisionai",
                "https://youtube.com/@courtvisionai",
              ],
            }),
          }}
        />
        {/* JSON-LD: WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "CourtVision AI",
              url: "https://courtvision.ai",
              description:
                "AI-powered basketball coaching app with real-time pose estimation and form analysis.",
              inLanguage: ["en", "fr"],
            }),
          }}
        />
      </head>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium focus:shadow-lg">
          Skip to content
        </a>
        <Providers>
          {children}
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}