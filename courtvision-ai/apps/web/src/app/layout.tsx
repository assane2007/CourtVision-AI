import type { Metadata, Viewport } from 'next'
import './globals.css'

const siteUrl = 'https://courtvision.ai'

export const viewport: Viewport = {
    themeColor: '#0D1117',
    width: 'device-width',
    initialScale: 1,
}

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'CourtVision AI — Le Coach IA qui te transforme',
        template: '%s | CourtVision AI',
    },
    description: 'L\'IA qui analyse ton jeu de basket en vidéo. Détection de tirs, analyse mentale, reconstruction 3D, highlights automatiques. Ton coach personnel dans ta poche.',
    keywords: [
        'basketball', 'IA', 'intelligence artificielle', 'coach', 'analyse vidéo',
        'sport tech', 'tir', 'mental', 'highlights', 'entraînement', 'basket',
        'shot analysis', 'digital twin', 'reconstruction 3D'
    ],
    authors: [{ name: 'CourtVision AI' }],
    creator: 'CourtVision AI',
    robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true },
    },
    openGraph: {
        title: 'CourtVision AI — Le Coach IA qui te transforme',
        description: 'L\'IA qui analyse ton jeu de basket. Détection de tirs, mental score, reconstruction 3D, highlights automatiques.',
        type: 'website',
        url: siteUrl,
        siteName: 'CourtVision AI',
        locale: 'fr_FR',
        images: [
            {
                url: '/og-image.svg',
                width: 1200,
                height: 630,
                alt: 'CourtVision AI — Analyse basket par Intelligence Artificielle',
            }
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'CourtVision AI — Le Coach IA qui te transforme',
        description: 'Le coach IA qui te transforme. Pas juste qui te compte.',
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

// JSON-LD Structured Data
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'CourtVision AI',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'iOS, Android',
    description: 'L\'IA qui analyse ton jeu de basket en vidéo. Coach personnel intelligent.',
    url: siteUrl,
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
        description: 'Gratuit pendant la beta',
    },
    aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '127',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr" className="scroll-smooth">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </head>
            <body className="font-sans antialiased">
                {children}
            </body>
        </html>
    )
}
