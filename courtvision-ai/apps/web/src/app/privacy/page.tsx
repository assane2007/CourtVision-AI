'use client'

import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
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
                    <h1 className="text-4xl font-display font-black mb-8 gradient-text">Privacy Policy</h1>
                    <div className="space-y-6 text-text-secondary leading-relaxed">
                        <p><strong>Effective Date: March 02, 2026</strong></p>
                        <p>CourtVision AI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and disclose information about you when you use our mobile application and services.</p>

                        <h2 className="text-xl font-bold text-text-primary mt-8">1. Information We Collect</h2>
                        <p><strong>Biometric Data</strong>: We analyze video footage to calculate skeletal tracking, shooting mechanics, and athletic performance. This data is processed locally where possible or securely on our AI Cloud.</p>
                        <p><strong>Video Content</strong>: Videos uploaded for 3D Court Reconstruction are stored securely and used solely for the purpose of generating your analysis.</p>
                        <p><strong>Account Information</strong>: Email, name, and training history.</p>

                        <h2 className="text-xl font-bold text-text-primary mt-8">2. How We Use Information</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>To provide AI-driven insights (Ghost Mode, Shadow League).</li>
                            <li>To generate Cinematic Highlight reels.</li>
                            <li>To improve our computer vision models.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-text-primary mt-8">3. Data Retention</h2>
                        <p>We retain your training data as long as your account is active to provide historical progress tracking.</p>

                        <h2 className="text-xl font-bold text-text-primary mt-8">4. Contact Us</h2>
                        <p>For privacy inquiries: legal@courtvision.ai</p>
                    </div>
                </motion.div>
            </div>
        </main>
    )
}
