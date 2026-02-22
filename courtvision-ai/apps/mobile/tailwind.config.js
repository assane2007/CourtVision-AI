/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: "#1A73E8",
                background: "#0D1117",
                surface: "#161B22",
                accent: "#00D4FF",
                success: "#00C853",
                warning: "#FFB300",
                error: "#FF3D57",
                text: "#E6EDF3",
                muted: "#8B949E"
            },
            fontFamily: {
                display: ["SF Pro Display Bold", "sans-serif"],
                body: ["SF Pro Text Regular", "sans-serif"],
                stats: ["Roboto Mono", "monospace"]
            }
        },
    },
    plugins: [],
}
