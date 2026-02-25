'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Brain, Target, Video, Activity, Users, Zap,
    ChevronRight, Check, Star, ArrowRight, Menu, X,
    Smartphone, BarChart3, Trophy, Eye, ChevronDown,
    Quote, Shield, Sparkles, Play, Flame, Layers,
    TrendingUp, Award
} from 'lucide-react'

// ==========================================
// HOOKS
// ==========================================
function useReveal<T extends HTMLElement>() {
    const ref = useRef<T>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add('visible')
                    observer.unobserve(el)
                }
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return ref
}

function useCountUp(target: number, duration = 1500) {
    const [value, setValue] = useState(0)
    const ref = useRef<HTMLDivElement>(null)
    const started = useRef(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true
                    const startTime = performance.now()
                    const tick = (now: number) => {
                        const elapsed = now - startTime
                        const progress = Math.min(elapsed / duration, 1)
                        const eased = 1 - Math.pow(1 - progress, 4)
                        setValue(Math.round(eased * target))
                        if (progress < 1) requestAnimationFrame(tick)
                    }
                    requestAnimationFrame(tick)
                }
            },
            { threshold: 0.5 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [target, duration])

    return { value, ref }
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
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass shadow-lg shadow-black/20' : 'bg-transparent'}`}
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
                        <a
                            href="#waitlist"
                            className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-full font-semibold transition-all hover:shadow-lg hover:shadow-primary/25 text-sm btn-glow"
                        >
                            Join Beta
                        </a>
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
                    <div className="md:hidden pb-4 flex flex-col gap-1 animate-slide-up">
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
                        <a
                            href="#waitlist"
                            onClick={closeMenu}
                            className="bg-primary text-white px-5 py-3 rounded-full font-semibold text-center mt-2"
                        >
                            Join Beta
                        </a>
                    </div>
                )}
            </div>
        </nav>
    )
}

// ==========================================
// HERO
// ==========================================
function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5" />

            {/* Ambient glow orbs */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/[0.04] rounded-full blur-[120px]" />
            <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-accent/[0.03] rounded-full blur-[100px]" />

            {/* Court lines SVG */}
            <svg className="absolute opacity-[0.03] w-[900px] h-[650px]" viewBox="0 0 800 600" fill="none" aria-hidden="true">
                <rect x="50" y="50" width="700" height="500" rx="5" stroke="#FF6B00" strokeWidth="1.5" className="court-line" />
                <line x1="400" y1="50" x2="400" y2="550" stroke="#FF6B00" strokeWidth="1.5" className="court-line" />
                <circle cx="400" cy="300" r="60" stroke="#FF6B00" strokeWidth="1.5" className="court-line" />
                <rect x="50" y="175" width="150" height="250" stroke="#FF6B00" strokeWidth="1.5" className="court-line" />
                <rect x="600" y="175" width="150" height="250" stroke="#FF6B00" strokeWidth="1.5" className="court-line" />
                <path d="M 50 237 A 75 75 0 0 1 200 237" stroke="#FF6B00" strokeWidth="1" className="court-line" fill="none" />
                <path d="M 600 237 A 75 75 0 0 0 750 237" stroke="#FF6B00" strokeWidth="1" className="court-line" fill="none" />
            </svg>

            <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-surface/80 border border-border rounded-full px-4 py-2 mb-8 animate-fade-in">
                    <span className="flex h-2 w-2 rounded-full bg-green animate-pulse" />
                    <span className="text-sm text-text-secondary">Open Beta &mdash; Limited Spots</span>
                    <Sparkles size={14} className="text-primary" />
                </div>

                {/* Headline */}
                <h1 className="text-5xl sm:text-6xl lg:text-8xl font-display font-black leading-[1.02] mb-6 animate-slide-up tracking-tight">
                    <span className="text-text-primary">Play like</span>
                    <br />
                    <span className="gradient-text">a pro.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
                    AI that analyzes your basketball game from video. Shot tracking,
                    mental scoring, 3D reconstruction, auto highlights.
                    <span className="text-primary font-semibold"> Your personal coach in your pocket.</span>
                </p>

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <a
                        href="#waitlist"
                        className="group bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-full font-bold text-lg transition-all btn-glow flex items-center gap-2 hover:shadow-xl hover:shadow-primary/30"
                    >
                        Try for Free
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                    <a
                        href="#how-it-works"
                        className="text-text-secondary hover:text-text-primary border border-border hover:border-border-light px-8 py-4 rounded-full font-medium transition-all flex items-center gap-2 hover:bg-surface/50"
                    >
                        See How It Works
                        <Play size={16} />
                    </a>
                </div>

                {/* Social proof */}
                <div className="mt-14 flex flex-wrap justify-center items-center gap-6 text-text-secondary text-sm animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} className="fill-yellow text-yellow" />
                        ))}
                        <span className="ml-2">4.9/5 from beta testers</span>
                    </div>
                    <span className="hidden sm:inline text-border-strong">&bull;</span>
                    <span className="flex items-center gap-1.5">
                        <BarChart3 size={14} className="text-primary" />
                        2,500+ games analyzed
                    </span>
                    <span className="hidden sm:inline text-border-strong">&bull;</span>
                    <span className="flex items-center gap-1.5">
                        <Users size={14} className="text-accent" />
                        Used in 15 countries
                    </span>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <ChevronDown size={24} className="text-text-tertiary" />
            </div>
        </section>
    )
}

// ==========================================
// STATS BAR
// ==========================================
function StatsBar() {
    const s1 = useCountUp(7, 1000)
    const s2 = useCountUp(33, 1200)
    const s3 = useCountUp(2500, 1800)
    const ref = useReveal<HTMLDivElement>()

    return (
        <section ref={ref} className="py-16 px-4 border-y border-border reveal">
            <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center" ref={s1.ref}>
                    <div className="text-4xl sm:text-5xl font-display font-black gradient-text mb-2">{s1.value}</div>
                    <div className="text-text-secondary text-sm">AI pipeline stages</div>
                </div>
                <div className="text-center" ref={s2.ref}>
                    <div className="text-4xl sm:text-5xl font-display font-black gradient-text mb-2">{s2.value}</div>
                    <div className="text-text-secondary text-sm">body keypoints tracked</div>
                </div>
                <div className="text-center" ref={s3.ref}>
                    <div className="text-4xl sm:text-5xl font-display font-black gradient-text mb-2">{s3.value}+</div>
                    <div className="text-text-secondary text-sm">games analyzed</div>
                </div>
                <div className="text-center">
                    <div className="text-4xl sm:text-5xl font-display font-black gradient-text mb-2">&lt; 2min</div>
                    <div className="text-text-secondary text-sm">full analysis time</div>
                </div>
            </div>
        </section>
    )
}

// ==========================================
// FEATURES
// ==========================================
const features = [
    {
        icon: <Target size={24} />,
        title: 'AI Shot Analysis',
        desc: 'Auto-detect every shot, zone, posture, and elbow angle. Compare your form against NBA players.',
        color: 'text-primary',
        bg: 'bg-primary/10',
    },
    {
        icon: <Brain size={24} />,
        title: 'Mental Score',
        desc: 'Body language analysis that detects frustration, fatigue, and confidence drops in real time.',
        color: 'text-violet',
        bg: 'bg-violet/10',
    },
    {
        icon: <Eye size={24} />,
        title: '3D Reconstruction',
        desc: 'Bird\'s eye court view from a single phone camera. Heatmaps, distances, positioning insights.',
        color: 'text-accent',
        bg: 'bg-accent/10',
    },
    {
        icon: <Video size={24} />,
        title: 'Auto Highlights',
        desc: 'ESPN-level highlight reels in 2 minutes. 3 templates. One-tap share to TikTok, IG, YouTube.',
        color: 'text-red',
        bg: 'bg-red/10',
    },
    {
        icon: <Activity size={24} />,
        title: 'Live Coach',
        desc: 'Real-time analysis during your game. Haptic alerts. Summary after each quarter.',
        color: 'text-green',
        bg: 'bg-green/10',
    },
    {
        icon: <Layers size={24} />,
        title: 'Digital Twin',
        desc: 'Your AI avatar evolves with every game. Compare to pros. Coaches can test tactics on your twin.',
        color: 'text-yellow',
        bg: 'bg-yellow/10',
    },
    {
        icon: <Trophy size={24} />,
        title: 'Community & Challenges',
        desc: 'The Strava of basketball. Friend leaderboards, weekly challenges, public profiles with stats.',
        color: 'text-primary',
        bg: 'bg-primary/10',
    },
    {
        icon: <TrendingUp size={24} />,
        title: '30-Day Program',
        desc: 'AI generates a personalized training plan based on your weaknesses. Gamified like Duolingo.',
        color: 'text-green',
        bg: 'bg-green/10',
    },
]

function Features() {
    const titleRef = useReveal<HTMLDivElement>()
    const gridRef = useReveal<HTMLDivElement>()

    return (
        <section id="features" className="py-28 px-4">
            <div className="max-w-7xl mx-auto">
                <div ref={titleRef} className="text-center mb-16 reveal">
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider font-display">Features</span>
                    <h2 className="text-4xl sm:text-5xl font-display font-bold text-text-primary mt-3 mb-4">
                        8 <span className="gradient-text">game-changing</span> features
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto text-lg">
                        Not just a shot counter. A real AI coach that analyzes every aspect of your game.
                    </p>
                </div>

                <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 reveal-stagger">
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className="group glass-card rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 card-shine"
                        >
                            <div className={`${f.bg} ${f.color} w-11 h-11 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                {f.icon}
                            </div>
                            <h3 className="text-base font-bold text-text-primary mb-2 font-display">{f.title}</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
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
    const ref = useReveal<HTMLDivElement>()

    return (
        <section className="py-28 px-4 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div ref={ref} className="text-center mb-16 reveal">
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider font-display">Testimonials</span>
                    <h2 className="text-4xl sm:text-5xl font-display font-bold text-text-primary mt-3 mb-4">
                        They already <span className="gradient-text">leveled up</span>
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto">
                        Players, coaches, and academies trust CourtVision during beta.
                    </p>
                </div>

                <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                    <div className="flex animate-marquee w-max gap-6">
                        {[...testimonials, ...testimonials].map((t, i) => (
                            <div
                                key={i}
                                className="glass-card rounded-2xl p-6 w-[360px] flex-shrink-0 hover:border-primary/20 transition-colors"
                            >
                                <div className="flex items-center gap-1 mb-3">
                                    {[...Array(t.rating)].map((_, j) => (
                                        <Star key={j} size={13} className="fill-yellow text-yellow" />
                                    ))}
                                </div>
                                <Quote size={16} className="text-primary/30 mb-2" />
                                <p className="text-text-secondary text-sm leading-relaxed mb-4">{t.text}</p>
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
        </section>
    )
}

// ==========================================
// HOW IT WORKS
// ==========================================
const steps = [
    { num: '01', title: 'Film your game', desc: 'Set your phone on the sideline. That\'s all you need.', icon: <Smartphone size={22} /> },
    { num: '02', title: 'AI analyzes', desc: '7-stage pipeline: tracking, 3D, shots, mental, report, highlights. Under 2 minutes.', icon: <Zap size={22} /> },
    { num: '03', title: 'Get your report', desc: 'Complete stats, mental analysis, NBA comparison, personalized training program.', icon: <BarChart3 size={22} /> },
    { num: '04', title: 'Share & improve', desc: 'Viral highlights, friend challenges, Duolingo-style streaks, 30-day progression.', icon: <Award size={22} /> },
]

function HowItWorks() {
    const ref = useReveal<HTMLDivElement>()

    return (
        <section id="how-it-works" className="py-28 px-4 bg-surface/30">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider font-display">How It Works</span>
                    <h2 className="text-4xl sm:text-5xl font-display font-bold text-text-primary mt-3 mb-4">
                        Simple as <span className="gradient-text">1-2-3-4</span>
                    </h2>
                </div>

                <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 reveal-stagger">
                    {steps.map((step, i) => (
                        <div key={i} className="relative group">
                            <div className="text-6xl font-display font-black text-primary/10 mb-4 group-hover:text-primary/20 transition-colors">{step.num}</div>
                            <div className="text-primary mb-3 group-hover:scale-110 transition-transform inline-block">{step.icon}</div>
                            <h3 className="text-xl font-display font-bold text-text-primary mb-2">{step.title}</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">{step.desc}</p>
                            {i < steps.length - 1 && (
                                <ChevronRight className="hidden lg:block absolute top-8 -right-4 text-border-strong" size={24} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
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
    const ref = useReveal<HTMLDivElement>()

    return (
        <section id="pricing" className="py-28 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider font-display">Pricing</span>
                    <h2 className="text-4xl sm:text-5xl font-display font-bold text-text-primary mt-3 mb-4">
                        A plan for every <span className="gradient-text">ambition</span>
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto">
                        Start free during beta. No credit card required.
                    </p>
                </div>

                <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6 reveal-stagger">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className={`relative rounded-2xl p-8 border transition-all duration-300 hover:-translate-y-1 card-shine ${plan.popular
                                ? 'glass-amber shadow-lg shadow-primary/10 scale-[1.02]'
                                : 'glass-card'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-primary/30 font-display">
                                    Most Popular
                                </div>
                            )}
                            <h3 className="text-xl font-display font-bold text-text-primary mb-1">{plan.name}</h3>
                            <p className="text-text-secondary text-sm mb-6">{plan.desc}</p>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-5xl font-display font-black text-text-primary">${plan.price}</span>
                                <span className="text-text-secondary">{plan.period}</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                {plan.features.map((f, fi) => (
                                    <li key={fi} className="flex items-start gap-2.5 text-sm text-text-secondary">
                                        <Check size={16} className="text-green mt-0.5 flex-shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <a
                                href="#waitlist"
                                className={`block text-center py-3 rounded-full font-semibold transition-all ${plan.popular
                                    ? 'bg-primary hover:bg-primary-hover text-white hover:shadow-lg hover:shadow-primary/25 btn-glow'
                                    : 'bg-elevated border border-border hover:border-primary/30 text-text-primary hover:bg-overlay'
                                    }`}
                            >
                                {plan.cta}
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </section>
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
        a: 'Yes! Our 7-stage AI pipeline processes a full 45-minute game in under 2 minutes using Groq inference and our optimized cloud architecture.',
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
    const ref = useReveal<HTMLDivElement>()

    return (
        <section className="py-28 px-4 bg-surface/30">
            <div ref={ref} className="max-w-3xl mx-auto reveal">
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
        </section>
    )
}

// ==========================================
// TRUST BAR
// ==========================================
function TrustBar() {
    const ref = useReveal<HTMLDivElement>()

    return (
        <section ref={ref} className="py-12 px-4 reveal">
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
        </section>
    )
}

// ==========================================
// WAITLIST / CTA
// ==========================================
function Waitlist() {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)
    const ref = useReveal<HTMLDivElement>()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setLoading(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.courtvision.ai'
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
        <section id="waitlist" className="py-28 px-4">
            <div ref={ref} className="max-w-3xl mx-auto text-center reveal">
                <div className="relative glass-amber rounded-3xl p-12 overflow-hidden noise-overlay">
                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 w-36 h-36 bg-accent/10 rounded-full blur-[60px]" />

                    <div className="relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                            <Flame size={28} className="text-primary" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary mb-4">
                            Ready to transform your game?
                        </h2>
                        <p className="text-text-secondary mb-8 max-w-lg mx-auto">
                            Join the private beta. Free access for the first 500 players.
                            No credit card required.
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
                                    className="flex-1 bg-background border border-border-light rounded-full px-5 py-3 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white px-8 py-3 rounded-full font-bold transition-all whitespace-nowrap btn-glow hover:shadow-lg hover:shadow-primary/30"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </span>
                                    ) : (
                                        'Join the Beta'
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
        </section>
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
                        <a href="#" className="hover:text-text-primary transition-colors">Privacy</a>
                        <a href="#" className="hover:text-text-primary transition-colors">Terms</a>
                        <a href="#" className="hover:text-text-primary transition-colors">Contact</a>
                        <a href="https://twitter.com/courtvisionai" className="hover:text-text-primary transition-colors" target="_blank" rel="noopener noreferrer">
                            Twitter
                        </a>
                    </div>

                    <p className="text-xs text-text-tertiary">
                        &copy; {currentYear} CourtVision AI. All rights reserved.
                    </p>
                </div>

                <div className="text-center mt-8 pt-6 border-t border-border">
                    <p className="text-xs text-text-tertiary/60">
                        Built with passion for the basketball community
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
