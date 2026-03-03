import type { Metadata, Viewport } from 'next'
import { Sora, DM_Sans } from 'next/font/google'
import './globals.css'

const sora = Sora({
    subsets: ['latin'],
    variable: '--font-sora',
    display: 'swap',
})

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-dm-sans',
    display: 'swap',
})
const siteUrl = 'https://courtvision.ai'

export const viewport: Viewport = {
    themeColor: '#080C12',
    width: 'device-width',
    initialScale: 1,
}

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'CourtVision AI — The Apex of Athletic Intelligence',
        template: '%s | CourtVision AI',
    },
    description: 'The world-record AI basketball coach. AR Ghost Tracking, 3D Court Reconstruction via Gaussian Splatting, and The Shadow League multi-agent simulations. Elite performance starts here.',
    keywords: [
        'basketball AI', 'AR ghost tracking', 'Gaussian Splatting sports', '3D court reconstruction',
        'shadow league', 'multi-agent simulation', 'NBA shooting mechanics', 'digital twin athlete',
        'automated basketball highlights', 'biometric HUD', 'smart basketball coach'
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

import NeuralHUD from '@/components/NeuralHUD'
import PageTransition from '@/components/PageTransition'

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`scroll-smooth ${sora.variable} ${dmSans.variable}`}>
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </head>
            <body className="font-body antialiased bg-void text-text-primary selection:bg-fire selection:text-white">
                <NeuralHUD />
                <PageTransition>
                    {children}
                </PageTransition>
            </body>
        </html>
    )
}
