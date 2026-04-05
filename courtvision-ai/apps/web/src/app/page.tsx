'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Brain, Target, Video, Activity, Users, Zap,
    ChevronRight, Check, Star, ArrowRight, Menu, X,
    Smartphone, BarChart3, Trophy, Eye, ChevronDown,
    Quote, Shield, Sparkles, Play, Flame, Layers,
    TrendingUp, Award
} from 'lucide-react'

import type { Variants } from 'framer-motion';
import { motion, animate, useInView } from 'framer-motion'
import Link from 'next/link'

// ==========================================
// HOOKS
// ==========================================

function useCountUp(target: number, duration = 1.5) {
    const [value, setValue] = useState(0)
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true, margin: "-50px" })

    useEffect(() => {
        if (isInView) {
            const controls = animate(0, target, {
                duration,
                ease: "easeOut",
                onUpdate(val) {
                    setValue(Math.round(val))
                }
            })
            return controls.stop
        }
        return undefined
    }, [target, duration, isInView])

    return { value, ref }
}

// Staggered variants for generic use
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
}

// ==========================================
// NAVBAR
// ==========================================
function Navbar() {
    const [open, setOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const closeMenu = useCallback(() => setOpen(false), [])

    const navLinks = [
        { href: '#features', label: 'Features' },
        { href: '#how-it-works', label: 'How It Works' },
        { href: '#pricing', label: 'Pricing' },
    ]

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-all duration-500 border-b border-white/0 ${scrolled ? 'bg-void/80 backdrop-blur-2xl border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.8)]' : 'bg-transparent'}`}
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <a href="#" className="flex items-center gap-2.5 group" aria-label="CourtVision AI">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Flame size={18} className="text-primary" />
                        </div>
                        <span className="text-lg font-display font-bold text-text-primary tracking-tight">
                            Court<span className="text-primary">Vision</span>
                        </span>
                    </a>

                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map(link => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
                            >
                                {link.label}
                            </a>
                        ))}
                        <Link
                            href="/dashboard"
                            className="relative group overflow-hidden bg-white text-void px-6 py-2.5 rounded-full font-black transition-all text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                PLAYER PORTAL
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Link>
                    </div>

                    <button
                        className="md:hidden text-text-primary p-2 -mr-2"
                        onClick={() => setOpen(!open)}
                        aria-expanded={open}
                        aria-label="Toggle menu"
                    >
                        {open ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="md:hidden pb-4 flex flex-col gap-1"
                    >
                        {navLinks.map(link => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={closeMenu}
                                className="text-text-secondary hover:text-text-primary transition py-3 px-3 rounded-lg hover:bg-surface"
                            >
                                {link.label}
                            </a>
                        ))}
                        <Link
                            href="/dashboard"
                            onClick={closeMenu}
                            className="bg-fire text-white px-5 py-3 rounded-full font-semibold text-center mt-2 shadow-lg shadow-fire/20"
                        >
                            Player Portal
                        </Link>
                    </motion.div>
                )}
            </div>
        </nav>
    )
}

import dynamic from 'next/dynamic'

const NeuralCourt = dynamic(() => import('@/components/NeuralCourt'), { ssr: false })
import SimulationTerminal from '@/components/SimulationTerminal'

const showMockTerminal = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_MOCK_UI === 'true'

// ==========================================
// HERO
// ==========================================
function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
            <div className="absolute inset-0 bg-gradient-to-b from-void via-void to-fire/5" />

            {/* Revolutionary 3D Background */}
            <NeuralCourt />

            {/* Ambient glow orbs */}
            <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[20%] left-[60%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-fire rounded-full blur-[150px] pointer-events-none mix-blend-screen"
            />
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-[0%] left-[20%] w-[600px] h-[600px] bg-accent rounded-full blur-[150px] pointer-events-none mix-blend-screen"
            />

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-left"
                >
                    {/* Badge */}
                    <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-2 mb-8">
                        <span className="flex h-2 w-2 rounded-full bg-fire animate-pulse" />
                        <span className="text-xs uppercase tracking-widest text-text-secondary font-mono">NEURAL NETWORK ACTIVE</span>
                        <Sparkles size={14} className="text-fire" />
                    </motion.div>

                    {/* Headline */}
                    <motion.h1 variants={itemVariants} className="text-5xl sm:text-7xl lg:text-[7rem] font-display font-black leading-[0.9] mb-8 tracking-tighter uppercase break-words drop-shadow-2xl">
                        THE APEX OF
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-fire via-[#ff7a33] to-red-500 drop-shadow-[0_0_25px_rgba(255,77,0,0.4)]">
                            INTELLIGENCE.
                        </span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p variants={itemVariants} className="text-lg sm:text-xl text-text-secondary max-w-xl mb-10 leading-relaxed uppercase tracking-[0.15em] font-mono text-[12px] opacity-80">
                        AR Ghost Tracking • Digital Twin Matchups • Elite Biometrics.
                        <span className="text-fire font-semibold block mt-1"> The future of basketball is here.</span>
                    </motion.p>

                    {/* CTA buttons */}
                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6 items-start mb-12">
                        <Link
                            href="/dashboard"
                            className="group relative overflow-hidden bg-fire text-white px-10 py-5 rounded-full font-black text-sm tracking-[0.2em] transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,77,0,0.4)] flex items-center gap-3 uppercase"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                INITIALIZE TWIN
                                <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                            </span>
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        </Link>

                        <div className="flex items-center gap-3">
                            <div className="h-14 w-40 bg-surface border border-white/10 rounded-xl flex items-center justify-center cursor-not-allowed grayscale opacity-50 relative overflow-hidden group">
                                <div className="text-[9px] text-text-tertiary font-mono tracking-widest">APP STORE</div>
                            </div>
                            <div className="h-14 w-40 bg-surface border border-white/10 rounded-xl flex items-center justify-center cursor-not-allowed grayscale opacity-50 relative overflow-hidden group">
                                <div className="text-[9px] text-text-tertiary font-mono tracking-widest">PLAY STORE</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Social proof */}
                    <motion.div variants={itemVariants} className="flex items-center gap-6 text-text-secondary text-[11px] font-mono uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full border border-void bg-surface" />)}
                            </div>
                            <span>+2.5K USERS</span>
                        </div>
                        <span className="text-border-strong">/ /</span>
                        <span>15 COUNTRIES</span>
                    </motion.div>
                </motion.div>

                {/* Simulation Terminal - Hidden on small, visible on LG */}
                {showMockTerminal ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
                        animate={{ opacity: 1, scale: 1, rotateY: -10 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                        className="hidden lg:block perspective-1000"
                    >
                        <SimulationTerminal />
                    </motion.div>
                ) : null}
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, 10, 0] }}
                transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <ChevronDown size={24} className="text-text-tertiary" />
            </motion.div>
        </section>
    )
}

// ==========================================
// STATS BAR
// ==========================================
function StatsBar() {
    const s1 = useCountUp(7, 1.2)
    const s2 = useCountUp(33, 1.4)
    const s3 = useCountUp(2500, 1.8)

    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="py-20 px-4 border-y border-white/5 bg-gradient-to-b from-void to-[#0a0a0f]"
        >
            <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-12">
                <div className="text-center group" ref={s1.ref}>
                    <div className="text-5xl sm:text-6xl font-display font-black text-white mb-3 tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform">{s1.value}</div>
                    <div className="text-text-secondary text-xs uppercase tracking-[0.2em] font-mono">Neural Layers</div>
                </div>
                <div className="text-center group" ref={s2.ref}>
                    <div className="text-5xl sm:text-6xl font-display font-black text-white mb-3 tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform">{s2.value}</div>
                    <div className="text-text-secondary text-xs uppercase tracking-[0.2em] font-mono">Keypoints Mapped</div>
                </div>
                <div className="text-center group" ref={s3.ref}>
                    <div className="text-5xl sm:text-6xl font-display font-black text-white mb-3 tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform">{s3.value}+</div>
                    <div className="text-text-secondary text-xs uppercase tracking-[0.2em] font-mono">Sessions Processed</div>
                </div>
                <div className="text-center group">
                    <div className="text-5xl sm:text-6xl font-display font-black text-fire mb-3 tracking-tighter drop-shadow-[0_0_20px_rgba(255,77,0,0.5)] group-hover:scale-110 transition-transform">&lt; 2m</div>
                    <div className="text-text-secondary text-xs uppercase tracking-[0.2em] font-mono">Engine Inference</div>
                </div>
            </div>
        </motion.section>
    )
}

// ==========================================
// FEATURES
// ==========================================
const features = [
    {
        icon: <Zap size={24} />,
        title: 'Ghost Mode AR',
        desc: 'Interactive skeletal analysis. Compare your shooting mechanics frame-by-frame against your perfectly calibrated Digital Twin.',
        color: 'text-primary',
        bg: 'bg-primary/10',
    },
    {
        icon: <Eye size={24} />,
        title: '3D Court Reconstruct',
        desc: 'Turn a single 2D video into a fully navigable 3D Gaussian Splatting scene. Re-watch your highlights from any angle.',
        color: 'text-accent',
        bg: 'bg-accent/10',
    },
    {
        icon: <Users size={24} />,
        title: 'The Shadow League',
        desc: 'Multi-agent simulation engine. Your digital twin plays 1,000 matches nightly to reveal your ultimate tactical edge.',
        color: 'text-violet',
        bg: 'bg-violet/10',
    },
    {
        icon: <Video size={24} />,
        title: 'Cinematic Highlights',
        desc: 'Auto-generate TikTok reels with "Iron Man" style biometric HUDs. Pro-level editing powered by athletic vision models.',
        color: 'text-red',
        bg: 'bg-red/10',
    },
    {
        icon: <Activity size={24} />,
        title: 'Live Playbook',
        desc: 'Holographic objectives during play. Earn XP and complete real-time training challenges using live AR tracking.',
        color: 'text-green',
        bg: 'bg-green/10',
    },
    {
        icon: <Award size={24} />,
        title: 'Skill DNA Score',
        desc: 'High-fidelity tracking of 33+ body keypoints to quantify your athletic potential and identify mechanics breakdown.',
        color: 'text-yellow',
        bg: 'bg-yellow/10',
    },
    {
        icon: <Brain size={24} />,
        title: 'Predictive Insights',
        desc: 'AI that forecasts your next move. Understand your offensive patterns and defensive gaps with precision data.',
        color: 'text-primary',
        bg: 'bg-primary/10',
    },
    {
        icon: <TrendingUp size={24} />,
        title: 'Elite Curriculum',
        desc: 'Daily regimen generated by the coach agent based on your previous night\'s Shadow League simulation results.',
        color: 'text-green',
        bg: 'bg-green/10',
    },
]

function Features() {
    return (
        <motion.section
            id="features"
            className="py-28 px-4 bg-void relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
        >
            <div className="absolute top-[10%] left-0 w-full h-[500px] bg-fire/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="max-w-7xl mx-auto relative z-10">
                <motion.div variants={itemVariants} className="text-center mb-16">
                    <span className="text-fire font-black text-xs uppercase tracking-[0.3em] font-mono mb-4 block">System Architecture</span>
                    <h2 className="text-4xl sm:text-6xl font-display font-black text-white mt-1 mb-6 tracking-tighter">
                        8 <span className="text-transparent bg-clip-text bg-gradient-to-r from-fire via-[#ff7a33] to-red-500 drop-shadow-[0_0_15px_rgba(255,77,0,0.3)]">GAME-CHANGING</span> MODULES
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto text-lg leading-relaxed">
                        We didn't build a shot counter. We built an autonomous machine learning coach that analyzes every micro-movement.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((f, i) => (
                        <motion.div
                            variants={itemVariants}
                            key={i}
                            className="group relative bg-[#060608] border border-white/5 rounded-3xl p-8 hover:border-fire/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(255,77,0,0.15)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className={`${f.bg} ${f.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
                                {f.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 font-display tracking-tight">{f.title}</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    )
}

// ==========================================
// TESTIMONIALS
// ==========================================
const testimonials = [
    {
        name: 'Marcus T.',
        role: 'U18 Player  Chicago',
        text: 'In 3 weeks, my mid-range percentage went from 38% to 52%. The AI caught a posture problem my real coach never spotted.',
        rating: 5,
        avatar: '',
    },
    {
        name: 'Coach Williams',
        role: 'Head Coach  Bay Area',
        text: 'I save 4 hours a week on film review. The auto highlights are perfect for motivating my players. Absolute game-changer.',
        rating: 5,
        avatar: '',
    },
    {
        name: 'Aisha D.',
        role: 'D2 Guard  Atlanta',
        text: 'The Mental Score helped me understand why I miss free throws late in games. Like having a sports psychologist in my pocket.',
        rating: 5,
        avatar: '',
    },
    {
        name: 'Tyler R.',
        role: 'Rec League  Los Angeles',
        text: 'My highlight TikToks hit 50K views. The auto edits are incredible. My friends can\'t believe it\'s AI-generated.',
        rating: 5,
        avatar: '',
    },
    {
        name: 'David K.',
        role: 'Athletic Director  Academy',
        text: 'We equipped our entire academy. The AI reports let us track progression of 40 young players effortlessly.',
        rating: 5,
        avatar: '',
    },
    {
        name: 'Ava M.',
        role: 'U16 Player  Houston',
        text: 'The gamified 30-day program is addictive. Hit a 22-day streak and my three-point shot has never been better.',
        rating: 4,
        avatar: '',
    },
]

function Testimonials() {
    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="py-28 px-4 overflow-hidden bg-[#060608] border-y border-white/5"
        >
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <span className="text-fire font-black text-xs uppercase tracking-[0.3em] font-mono mb-4 block">Testimonials</span>
                    <h2 className="text-4xl sm:text-6xl font-display font-black text-white mt-1 mb-6 tracking-tighter">
                        THEY ALREADY <span className="text-transparent bg-clip-text bg-gradient-to-r from-fire via-[#ff7a33] to-red-500 drop-shadow-[0_0_15px_rgba(255,77,0,0.3)]">LEVELED UP</span>
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto text-lg">
                        Players, coaches, and academies trust CourtVision.
                    </p>
                </div>

                <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                    <div className="flex animate-marquee w-max gap-6 hover:[animation-play-state:paused]">
                        {[...testimonials, ...testimonials].map((t, i) => (
                            <div
                                key={i}
                                className="bg-void border border-white/5 rounded-3xl p-8 w-[400px] flex-shrink-0 hover:border-fire/20 hover:shadow-[0_0_20px_rgba(255,77,0,0.1)] transition-all duration-300"
                            >
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(t.rating)].map((_, j) => (
                                        <Star key={j} size={14} className="fill-yellow text-yellow drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]" />
                                    ))}
                                </div>
                                <Quote size={20} className="text-fire/40 mb-4" />
                                <p className="text-text-secondary text-[15px] leading-relaxed mb-6 font-medium">"{t.text}"</p>
                                <div className="flex items-center gap-3 pt-3 border-t border-border">
                                    <span className="text-xl">{t.avatar}</span>
                                    <div>
                                        <div className="text-text-primary font-semibold text-sm">{t.name}</div>
                                        <div className="text-text-tertiary text-xs">{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.section>
    )
}

// ==========================================
// HOW IT WORKS
// ==========================================
const steps = [
    { num: '01', title: 'Uplink Video', desc: 'Securely sync your court footage to the Cloud from the app.', icon: <Smartphone size={22} /> },
    { num: '02', title: 'AI Extraction', desc: 'Skeletal mapping, 3D scene reconstruction, and biometric quantification.', icon: <Zap size={22} /> },
    { num: '03', title: 'Simulate', desc: 'Nightly Shadow League simulations pit your Digital Twin against the community.', icon: <BarChart3 size={22} /> },
    { num: '04', title: 'Evolution', desc: 'Receive your Morning Report & Adaptive Training Plan based on results.', icon: <Award size={22} /> },
]

function HowItWorks() {
    return (
        <motion.section
            id="how-it-works"
            className="py-28 px-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
        >
            <div className="max-w-6xl mx-auto">
                <motion.div variants={itemVariants} className="text-center mb-20">
                    <span className="text-fire font-black text-xs uppercase tracking-[0.3em] font-mono mb-4 block">Operation Flow</span>
                    <h2 className="text-4xl sm:text-6xl font-display font-black text-white mt-1">
                        SIMPLE AS <span className="text-transparent bg-clip-text bg-gradient-to-r from-fire via-[#ff7a33] to-red-500 drop-shadow-[0_0_15px_rgba(255,77,0,0.3)]">1-2-3-4</span>
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, i) => (
                        <motion.div variants={itemVariants} key={i} className="relative group p-6 rounded-3xl border border-transparent hover:border-white/5 hover:bg-white/[0.01] transition-colors">
                            <div className="text-[5rem] leading-none font-display font-black text-white/5 mb-6 group-hover:text-fire/10 transition-colors drop-shadow-md">{step.num}</div>
                            <div className="text-fire mb-4 group-hover:scale-110 transition-transform inline-block drop-shadow-[0_0_10px_rgba(255,77,0,0.5)]">{step.icon}</div>
                            <h3 className="text-xl font-display font-black text-white mb-3 tracking-tight">{step.title}</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">{step.desc}</p>
                            {i < steps.length - 1 && (
                                <ChevronRight className="hidden lg:block absolute top-12 -right-6 text-white/10" size={32} />
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    )
}

// ==========================================
// PRICING
// ==========================================
const plans = [
    {
        name: 'Player',
        price: '9',
        period: '/mo',
        desc: 'For players who want to improve',
        features: [
            '5 video analyses / month',
            'Full AI report + 7-day program',
            'Auto highlight reel',
            'Community access + challenges',
            'Basic Digital Twin',
        ],
        cta: 'Get Started',
        popular: false,
    },
    {
        name: 'Coach',
        price: '29',
        period: '/mo',
        desc: 'For coaches and teams',
        features: [
            'Unlimited analyses',
            'Up to 15 players',
            'Full team dashboard',
            'Video annotation + feedback',
            'Opponent tactical analysis',
            'All highlight templates',
        ],
        cta: 'Choose Coach',
        popular: true,
    },
    {
        name: 'Academy',
        price: '99',
        period: '/mo',
        desc: 'For clubs and academies',
        features: [
            'Everything in Coach',
            'Unlimited players',
            'API access',
            'Branded PDF reports',
            'Priority support',
            'Early access to new features',
        ],
        cta: 'Contact Us',
        popular: false,
    },
]

function Pricing() {
    return (
        <motion.section
            id="pricing"
            className="py-28 px-4 bg-[#060608] border-y border-white/5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
        >
            <div className="max-w-6xl mx-auto">
                <motion.div variants={itemVariants} className="text-center mb-16">
                    <span className="text-fire font-black text-xs uppercase tracking-[0.3em] font-mono mb-4 block">Billing</span>
                    <h2 className="text-4xl sm:text-6xl font-display font-black text-white mt-1 mb-6 tracking-tighter">
                        A PLAN FOR EVERY <span className="text-transparent bg-clip-text bg-gradient-to-r from-fire via-[#ff7a33] to-red-500 drop-shadow-[0_0_15px_rgba(255,77,0,0.3)]">AMBITION</span>
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto text-lg">
                        Start free. Scale when you turn pro.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan, i) => (
                        <motion.div
                            variants={itemVariants}
                            key={i}
                            className={`relative rounded-3xl p-8 border transition-all duration-500 hover:-translate-y-2 ${plan.popular
                                ? 'bg-void border-fire/40 shadow-[0_0_30px_rgba(255,77,0,0.2)] scale-[1.03] z-10'
                                : 'bg-void border-white/5 hover:border-white/10 shadow-2xl'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-fire text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-[0_0_10px_rgba(255,77,0,0.5)]">
                                    Most Popular
                                </div>
                            )}
                            <h3 className="text-2xl font-display font-black text-white mb-2">{plan.name}</h3>
                            <p className="text-text-secondary text-sm mb-6">{plan.desc}</p>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-5xl font-display font-black text-white">${plan.price}</span>
                                <span className="text-text-tertiary"> {plan.period}</span>
                            </div>
                            <ul className="space-y-4 mb-10">
                                {plan.features.map((f, fi) => (
                                    <li key={fi} className="flex items-start gap-3 text-sm text-text-secondary">
                                        <Check size={18} className="text-fire mt-0.5 flex-shrink-0 drop-shadow-[0_0_5px_rgba(255,77,0,0.6)]" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/dashboard"
                                className={`block text-center py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all ${plan.popular
                                    ? 'bg-fire hover:bg-[#ff5500] text-white shadow-[0_0_20px_rgba(255,77,0,0.4)] hover:shadow-[0_0_30px_rgba(255,77,0,0.6)] hover:scale-105'
                                    : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white hover:scale-105'
                                    }`}
                            >
                                {plan.cta}
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    )
}

// ==========================================
// FAQ
// ==========================================
const faqs = [
    {
        q: 'What phone do I need?',
        a: 'Any modern smartphone (iPhone 11+ or equivalent Android). Just your regular camera\u2014no special gear required.',
    },
    {
        q: 'Is the analysis really done in 2 minutes?',
        a: 'Yes! Our 7-stage AI pipeline processes a full 45-minute game in under 2 minutes using our optimized multi-model cloud inference stack.',
    },
    {
        q: 'Are my videos stored securely?',
        a: 'Absolutely. All videos are privately stored on Supabase with encryption. Only you can access them. We never use your footage to train our models without explicit consent.',
    },
    {
        q: 'Does it work for streetball / 3x3?',
        a: 'Yes! The AI adapts automatically to any format. 5v5, 3x3, or solo training\u2014everything gets analyzed.',
    },
    {
        q: 'Is it really free during beta?',
        a: 'Yes, the first 500 sign-ups get full access for free. No credit card required. We\'ll give you plenty of notice before any paid transition.',
    },
    {
        q: 'Does this replace a real coach?',
        a: 'No, it\'s a complement. We surface data and insights that even great coaches can\'t always catch with the naked eye. The best results come from coach + AI combined.',
    },
]

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="border-b border-border">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-5 text-left group"
                aria-expanded={open}
            >
                <span className="text-text-primary font-semibold pr-4 group-hover:text-primary transition-colors">{q}</span>
                <ChevronDown
                    size={20}
                    className={`text-text-secondary flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : ''}`}
                />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-48 pb-5' : 'max-h-0'}`}>
                <p className="text-text-secondary text-sm leading-relaxed">{a}</p>
            </div>
        </div>
    )
}

function FAQ() {
    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="py-28 px-4"
        >
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider font-display">FAQ</span>
                    <h2 className="text-4xl sm:text-5xl font-display font-bold text-text-primary mt-3 mb-4">
                        Frequently <span className="gradient-text">asked</span>
                    </h2>
                </div>

                <div>
                    {faqs.map((faq, i) => (
                        <FaqItem key={i} q={faq.q} a={faq.a} />
                    ))}
                </div>
            </div>
        </motion.section>
    )
}

// ==========================================
// TRUST BAR
// ==========================================
function TrustBar() {
    return (
        <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8 }}
            className="py-12 px-4"
        >
            <div className="max-w-4xl mx-auto flex flex-wrap justify-center items-center gap-8 text-text-tertiary text-sm">
                <div className="flex items-center gap-2">
                    <Shield size={16} />
                    <span>AES-256 Encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                    <span></span>
                    <span>GDPR Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                    <span></span>
                    <span>Private by Default</span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap size={16} />
                    <span>99.9% Uptime</span>
                </div>
            </div>
        </motion.section>
    )
}

// ==========================================
// WAITLIST / CTA
// ==========================================
function Waitlist() {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setLoading(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
            const res = await fetch(`${apiUrl}/api/waitlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'landing' }),
            })
            const data = await res.json()
            if (data.success) setSubmitted(true)
        } catch {
            setSubmitted(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.section
            id="waitlist"
            className="py-28 px-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
        >
            <div className="max-w-4xl mx-auto text-center">
                <div className="relative bg-[#060608] border border-white/5 rounded-[3rem] p-16 overflow-hidden">
                    {/* Decorative orbs */}
                    <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-fire/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-accent/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

                    <div className="relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-fire/10 border border-fire/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(255,77,0,0.2)]">
                            <Flame size={32} className="text-fire drop-shadow-[0_0_8px_rgba(255,77,0,0.5)]" />
                        </div>
                        <h2 className="text-4xl sm:text-6xl font-display font-black text-white mb-6 uppercase tracking-tighter">
                            UNLEASH YOUR DIGITAL TWIN
                        </h2>
                        <p className="text-text-secondary mb-8 max-w-lg mx-auto uppercase text-[12px] tracking-[0.2em] font-mono opacity-70">
                            Join the private elite beta. Restricted access to the first 500 athletes.
                        </p>

                        {submitted ? (
                            <div className="flex items-center justify-center gap-2 text-green font-semibold text-lg animate-slide-up">
                                <Check size={24} />
                                You&apos;re on the list! We&apos;ll reach out soon.
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                                <input
                                    type="email"
                                    placeholder="you@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    aria-label="Email address"
                                    className="flex-1 bg-void border border-white/10 rounded-full px-6 py-4 text-white placeholder-white/30 focus:outline-none focus:border-fire focus:ring-1 focus:ring-fire/50 transition-all font-medium text-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-fire hover:bg-[#ff5500] disabled:opacity-60 text-white px-10 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all whitespace-nowrap shadow-[0_0_20px_rgba(255,77,0,0.4)] hover:shadow-[0_0_30px_rgba(255,77,0,0.6)] hover:scale-105 flex items-center justify-center"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            SYNCING
                                        </span>
                                    ) : (
                                        'ENTER THE ARENA'
                                    )}
                                </button>
                            </form>
                        )}

                        <p className="text-text-tertiary text-xs mt-4">
                            Free during beta &bull; No spam &bull; Unsubscribe in 1 click
                        </p>
                    </div>
                </div>
            </div>
        </motion.section>
    )
}

// ==========================================
// FOOTER
// ==========================================
function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t border-border py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <a href="#" className="flex items-center gap-2 group">
                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                            <Flame size={14} className="text-primary" />
                        </div>
                        <span className="font-display font-bold text-text-primary tracking-tight">
                            Court<span className="text-primary">Vision</span>
                        </span>
                    </a>

                    <div className="flex gap-6 text-sm text-text-secondary">
                        <Link href="/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-text-primary transition-colors">Terms</Link>
                        <a href="mailto:legal@courtvision.ai" className="hover:text-text-primary transition-colors">Contact</a>
                        <a href="https://twitter.com/courtvisionai" className="hover:text-text-primary transition-colors" target="_blank" rel="noopener noreferrer">
                            Twitter
                        </a>
                    </div>

                    <p className="text-xs text-text-tertiary">
                        &copy; {currentYear} CourtVision AI. All rights reserved.
                    </p>
                </div>

                <div className="text-center mt-8 pt-6 border-t border-border">
                    <p className="text-xs text-text-tertiary/60 uppercase tracking-[0.3em] font-mono">
                        ENGINEERED FOR THE NEXT GENERATION OF ATHLETES
                    </p>
                </div>
            </div>
        </footer>
    )
}

// ==========================================
// HOME
// ==========================================
export default function Home() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <Hero />
            <StatsBar />
            <Features />
            <Testimonials />
            <HowItWorks />
            <Pricing />
            <FAQ />
            <TrustBar />
            <Waitlist />
            <Footer />
        </main>
    )
}
