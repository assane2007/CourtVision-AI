/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
    // Performance
    poweredByHeader: false,
    compress: true,

    // Security headers
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'X-DNS-Prefetch-Control', value: 'on' },
                ],
            },
        ]
    },

    // Redirects
    async redirects() {
        return [
            {
                source: '/beta',
                destination: '/#waitlist',
                permanent: false,
            },
        ]
    },
}

module.exports = nextConfig
