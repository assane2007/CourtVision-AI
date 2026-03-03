'use client'

import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-background text-text-primary p-8 md:p-24">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary transition-colors mb-12 group">
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Arena
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="prose prose-invert max-w-none"
                >
                    <h1 className="text-4xl font-display font-black mb-8 gradient-text">Terms of Service</h1>
                    <div className="space-y-6 text-text-secondary leading-relaxed">
                        <p><strong>Effective Date: March 02, 2026</strong></p>
                        <p>By using CourtVision AI, you agree to the following terms:</p>

                        <h2 className="text-xl font-bold text-text-primary mt-8">1. Description of Service</h2>
                        <p>CourtVision AI provides AI-powered sports analytics, including 3D reconstruction and multi-agent simulations.</p>

                        <h2 className="text-xl font-bold text-text-primary mt-8">2. AI Credits & Costs</h2>
                        <p>Certain features (Shadow League, 3D Reconstruction) consume high-performance GPU resources. Usage may be subject to credit limits or subscription tiers.</p>

                        <h2 className="text-xl font-bold text-text-primary mt-8">3. User Content</h2>
                        <p>You retain ownership of the videos you upload. You grant us a license to process this content to provide the requested AI analysis.</p>

                        <h2 className="text-xl font-bold text-text-primary mt-8">4. Limitations of Liability</h2>
                        <p>CourtVision AI is an analytical tool. We are not responsible for injuries sustained during athletic training.</p>
                    </div>
                </motion.div>
            </div>
        </main>
    )
}
