/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}'
    ],
    theme: {
        extend: {
            colors: {
                // Backgrounds
                background: '#080C12',
                surface: '#0D1219',
                elevated: '#131A24',
                overlay: '#1A2333',
                // Primary / Brand (Amber)
                primary: {
                    DEFAULT: '#FF6B00',
                    hover: '#FF8C36',
                    dark: '#CC5500',
                    dim: 'rgba(255,107,0,0.10)',
                    glow: 'rgba(255,107,0,0.28)',
                },
                // Accent (Blue)
                accent: {
                    DEFAULT: '#0A84FF',
                    light: '#4DA6FF',
                    dim: 'rgba(10,132,255,0.10)',
                },
                // Semantic
                green: {
                    DEFAULT: '#00C67A',
                    light: '#33D49A',
                    dim: 'rgba(0,198,122,0.10)',
                },
                red: {
                    DEFAULT: '#FF3A5E',
                    light: '#FF6B87',
                    dim: 'rgba(255,58,94,0.10)',
                },
                yellow: {
                    DEFAULT: '#FFBA00',
                    light: '#FFCB40',
                },
                violet: {
                    DEFAULT: '#A78BFA',
                    light: '#C4B5FD',
                    dim: 'rgba(167,139,250,0.10)',
                },
                gold: '#FFD700',
                // Text
                'text-primary': '#F2F6FC',
                'text-secondary': '#7C8FA3',
                'text-tertiary': '#48596B',
                // Borders
                border: {
                    DEFAULT: 'rgba(255,255,255,0.05)',
                    light: 'rgba(255,255,255,0.10)',
                    strong: 'rgba(255,255,255,0.14)',
                    amber: 'rgba(255,107,0,0.22)',
                },
            },
            fontFamily: {
                display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
                body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
                sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                '2xl': '16px',
                '3xl': '24px',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'slide-up': 'slide-up 0.6s ease-out forwards',
                'fade-in': 'fade-in 0.8s ease-out forwards',
                'orbit': 'orbit 8s linear infinite',
                'marquee': 'marquee 40s linear infinite',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(255,107,0,0.2)' },
                    '50%': { boxShadow: '0 0 50px rgba(255,107,0,0.5)' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(30px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                orbit: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
        },
    },
    plugins: [],
}
