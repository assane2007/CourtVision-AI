import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="text-center">
                <div className="text-8xl mb-6">🏀</div>
                <h1 className="text-6xl font-black text-text-primary mb-4">
                    4<span className="gradient-text">0</span>4
                </h1>
                <p className="text-xl text-text-secondary mb-8">
                    Oops ! Ce tir est passé à côté du panier.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-full font-bold text-lg transition-all hover:shadow-lg hover:shadow-primary/25"
                >
                    Retour au terrain
                </Link>
            </div>
        </div>
    )
}
