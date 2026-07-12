import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/', disallow: '/admin' },
    sitemap: 'https://courtvision.ai/sitemap.xml',
  }
}