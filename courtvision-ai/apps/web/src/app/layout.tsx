import type { Metadata, Viewport } from 'next'
import './globals.css'

const siteUrl = 'https://courtvision.ai'

export const viewport: Viewport = {
    themeColor: '#080C12',
    width: 'device-width',
    initialScale: 1,
}

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'CourtVision AI  The AI Coach That Transforms Your Game',
        template: '%s | CourtVision AI',
    },
    description: 'AI-powered basketball analysis from video. Shot detection, mental scoring, 3D reconstruction, auto highlights. Your personal coach in your pocket.',
    keywords: [
        'basketball', 'AI', 'artificial intelligence', 'coach', 'video analysis',
        'sport tech', 'shot tracking', 'mental game', 'highlights', 'training',
        'shot analysis', 'digital twin', '3D reconstruction', 'basketball analytics'
    ],
    authors: [{ name: 'CourtVision AI' }],
    creator: 'CourtVision AI',
    robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true },
    },
    openGraph: {
        title: 'CourtVision AI  The AI Coach That Transforms Your Game',
        description: 'AI that breaks down your basketball game. Shot detection, mental score, 3D reconstruction, auto highlights.',
        type: 'website',
        url: siteUrl,
        siteName: 'CourtVision AI',
        locale: 'en_US',
        images: [
            {
                url: '/og-image.svg',
                width: 1200,
                height: 630,
                alt: 'CourtVision AI  Basketball Analytics Powered by Artificial Intelligence',
            }
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'CourtVision AI  The AI Coach That Transforms Your Game',
        description: 'The AI coach that transforms you. Not just counts your shots.',
        images: ['/og-image.svg'],
        creator: '@courtvisionai',
    },
    icons: {
        icon: [
            { url: '/favicon.svg', type: 'image/svg+xml' },
        ],
        apple: '/apple-touch-icon.svg',
    },
    manifest: '/manifest.json',
}

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'CourtVision AI',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'iOS, Android',
    description: 'AI-powered basketball video analysis. Your intelligent personal coach.',
    url: siteUrl,
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free during beta',
    },
    aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2147',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="scroll-smooth">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </head>
            <body className="font-body antialiased">
                {children}
            </body>
        </html>
    )
}
