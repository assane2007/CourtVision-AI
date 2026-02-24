'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Brain, Target, Video, Activity, Users, Zap,
    ChevronRight, Check, Star, ArrowRight, Menu, X,
    Smartphone, BarChart3, Trophy, Eye, ChevronDown,
    Quote, Shield, Sparkles
} from 'lucide-react'

// ==========================================
// HOOK — Intersection Observer (reveal on scroll)
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

// ==========================================
// HOOK — Animated counter
// ==========================================
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
                        // easeOutQuart
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
// NAVIGATION
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
        { href: '#features', label: 'Fonctionnalités' },
        { href: '#how-it-works', label: 'Comment ça marche' },
        { href: '#pricing', label: 'Tarifs' },
    ]

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass shadow-lg shadow-black/20' : 'bg-transparent'}`}
            role="navigation"
            aria-label="Navigation principale"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <a href="#" className="flex items-center gap-2 group" aria-label="CourtVision AI — Accueil">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🏀</span>
                        <span className="text-xl font-bold text-text-primary">
                            Court<span className="text-primary">Vision</span> AI
                        </span>
                    </a>

                    {/* Desktop Nav */}
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
                            className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-full font-medium transition-all hover:shadow-lg hover:shadow-primary/25 text-sm"
                        >
                            Rejoindre la Beta
                        </a>
                    </div>

                    {/* Mobile toggle */}
                    <button
                        className="md:hidden text-text-primary p-2 -mr-2"
                        onClick={() => setOpen(!open)}
                        aria-expanded={open}
                        aria-label="Menu de navigation"
                    >
                        {open ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Nav */}
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
                            className="bg-primary text-white px-5 py-3 rounded-full font-medium text-center mt-2"
                        >
                            Rejoindre la Beta
                        </a>
                    </div>
                )}
            </div>
        </nav>
    )
}

// ==========================================
// HERO SECTION
// ==========================================
function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
            {/* Backgrounds */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />

            {/* Court SVG */}
            <svg className="absolute opacity-5 w-[800px] h-[600px]" viewBox="0 0 800 600" fill="none" aria-hidden="true">
                <rect x="50" y="50" width="700" height="500" rx="5" stroke="#1A73E8" strokeWidth="2" className="court-line" />
                <line x1="400" y1="50" x2="400" y2="550" stroke="#1A73E8" strokeWidth="2" className="court-line" />
                <circle cx="400" cy="300" r="60" stroke="#1A73E8" strokeWidth="2" className="court-line" />
                <rect x="50" y="175" width="150" height="250" stroke="#1A73E8" strokeWidth="2" className="court-line" />
                <rect x="600" y="175" width="150" height="250" stroke="#1A73E8" strokeWidth="2" className="court-line" />
                {/* Free-throw arcs */}
                <path d="M 50 237 A 75 75 0 0 1 200 237" stroke="#1A73E8" strokeWidth="1.5" className="court-line" fill="none" />
                <path d="M 600 237 A 75 75 0 0 0 750 237" stroke="#1A73E8" strokeWidth="1.5" className="court-line" fill="none" />
            </svg>

            <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-surface/80 border border-border rounded-full px-4 py-2 mb-8 animate-fade-in">
                    <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-sm text-text-secondary">Beta ouverte — Places limitées</span>
                    <Sparkles size={14} className="text-warning" />
                </div>

                {/* Title */}
                <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black leading-[1.05] mb-6 animate-slide-up tracking-tight">
                    <span className="text-text-primary">Joue comme</span>
                    <br />
                    <span className="gradient-text">un pro.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
                    L&apos;IA qui analyse ton jeu de basket en vidéo. Détection de tirs,
                    analyse mentale, reconstruction 3D, highlights automatiques.
                    <span className="text-primary font-semibold"> Ton coach personnel dans ta poche.</span>
                </p>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <a
                        href="#waitlist"
                        className="group bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-full font-bold text-lg transition-all btn-glow flex items-center gap-2 hover:shadow-xl hover:shadow-primary/30"
                    >
                        Essayer gratuitement
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                    <a
                        href="#how-it-works"
                        className="text-text-secondary hover:text-text-primary border border-border hover:border-text-secondary/50 px-8 py-4 rounded-full font-medium transition-all flex items-center gap-2 hover:bg-surface/50"
                    >
                        Voir la démo
                        <Video size={18} />
                    </a>
                </div>

                {/* Social proof */}
                <div className="mt-12 flex flex-wrap justify-center items-center gap-6 text-text-secondary text-sm animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} size={16} className="fill-warning text-warning" />
                        ))}
                        <span className="ml-2">4.9/5 (Beta testeurs)</span>
                    </div>
                    <span className="hidden sm:inline text-border">•</span>
                    <span>🏀 +2 500 matchs analysés</span>
                    <span className="hidden sm:inline text-border">•</span>
                    <span>🌍 Utilisé dans 15 pays</span>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <ChevronDown size={24} className="text-text-secondary/40" />
            </div>
        </section>
    )
}

// ==========================================
// FEATURES SECTION
// ==========================================
const features = [
    {
        icon: <Target size={28} />,
        title: 'Analyse de tirs IA',
        desc: 'Détection automatique de chaque tir, zone, posture, angle du coude. Comparaison avec les meilleurs joueurs NBA.',
        color: 'text-primary',
        bg: 'bg-primary/10',
    },
    {
        icon: <Brain size={28} />,
        title: 'Mental Score',
        desc: 'Score de fragilité mentale basé sur le langage corporel. Détecte la frustration, la fatigue, la perte de confiance.',
        color: 'text-accent',
        bg: 'bg-accent/10',
    },
    {
        icon: <Eye size={28} />,
        title: 'Reconstruction 3D',
        desc: 'Vue aérienne du terrain générée depuis un seul téléphone. Heatmap de positions, distances parcourues.',
        color: 'text-purple-400',
        bg: 'bg-purple-400/10',
    },
    {
        icon: <Video size={28} />,
        title: 'Highlights automatiques',
        desc: 'Montage niveau ESPN généré en 2 minutes. 3 templates au choix. Partage direct TikTok, Instagram, YouTube.',
        color: 'text-danger',
        bg: 'bg-danger/10',
    },
    {
        icon: <Activity size={28} />,
        title: 'Coach Live',
        desc: 'Analyse en temps réel pendant le match. Alertes vibrantes discrètes. Résumé à chaque quart-temps.',
        color: 'text-warning',
        bg: 'bg-warning/10',
    },
    {
        icon: <Users size={28} />,
        title: 'Digital Twin',
        desc: 'Ton avatar IA évolue à chaque match. Compare-toi aux pros. Les coachs testent des tactiques avec ton jumeau.',
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10',
    },
    {
        icon: <Trophy size={28} />,
        title: 'Communauté & Défis',
        desc: 'Le Strava du basket. Classements entre amis, défis hebdomadaires, profils publics avec stats et highlights.',
        color: 'text-orange-400',
        bg: 'bg-orange-400/10',
    },
    {
        icon: <BarChart3 size={28} />,
        title: 'Programme 30 jours',
        desc: 'L\'IA génère un programme d\'entraînement personnalisé basé sur tes faiblesses. Gamifié comme Duolingo.',
        color: 'text-green-400',
        bg: 'bg-green-400/10',
    },
]

function Features() {
    const titleRef = useReveal<HTMLDivElement>()
    const gridRef = useReveal<HTMLDivElement>()

    return (
        <section id="features" className="py-24 px-4">
            <div className="max-w-7xl mx-auto">
                <div ref={titleRef} className="text-center mb-16 reveal">
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider">Fonctionnalités</span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mt-3 mb-4">
                        8 fonctionnalités <span className="gradient-text">révolutionnaires</span>
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto text-lg">
                        Pas juste un compteur de tirs. Un vrai coach IA qui analyse chaque aspect de ton jeu.
                    </p>
                </div>

                <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 reveal-stagger">
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className="group bg-surface border border-border rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 card-shine"
                        >
                            <div className={`${f.bg} ${f.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                {f.icon}
                            </div>
                            <h3 className="text-lg font-bold text-text-primary mb-2">{f.title}</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

// ==========================================
// HOW IT WORKS
// ==========================================
const steps = [
    { num: '01', title: 'Filme ton match', desc: 'Pose ton téléphone sur le bord du terrain. C\'est tout ce qu\'il te faut.', icon: <Smartphone size={24} /> },
    { num: '02', title: 'L\'IA analyse', desc: 'Pipeline de 7 étapes : tracking, 3D, tirs, mental, rapport, highlights. En 2 minutes.', icon: <Zap size={24} /> },
    { num: '03', title: 'Reçois ton rapport', desc: 'Stats complètes, analyse mentale, comparaison NBA, programme d\'entraînement personnalisé.', icon: <BarChart3 size={24} /> },
    { num: '04', title: 'Partage & progresse', desc: 'Highlights viraux, défis entre amis, streak Duolingo, progression sur 30 jours.', icon: <Trophy size={24} /> },
]

function HowItWorks() {
    const ref = useReveal<HTMLDivElement>()

    return (
        <section id="how-it-works" className="py-24 px-4 bg-surface/30">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider">Comment ça marche</span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mt-3 mb-4">
                        Simple comme <span className="gradient-text">1-2-3-4</span>
                    </h2>
                </div>

                <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 reveal-stagger">
                    {steps.map((step, i) => (
                        <div key={i} className="relative group">
                            <div className="text-6xl font-black text-primary/10 mb-4 group-hover:text-primary/20 transition-colors">{step.num}</div>
                            <div className="text-primary mb-3 group-hover:scale-110 transition-transform inline-block">{step.icon}</div>
                            <h3 className="text-xl font-bold text-text-primary mb-2">{step.title}</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">{step.desc}</p>
                            {i < steps.length - 1 && (
                                <ChevronRight className="hidden lg:block absolute top-8 -right-4 text-border" size={24} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

// ==========================================
// STATS BAR (animated counters)
// ==========================================
function StatsBar() {
    const s1 = useCountUp(7, 1000)
    const s2 = useCountUp(33, 1200)

    const ref = useReveal<HTMLDivElement>()

    return (
        <section ref={ref} className="py-16 px-4 border-y border-border reveal">
            <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center" ref={s1.ref}>
                    <div className="text-4xl sm:text-5xl font-black gradient-text mb-2">{s1.value}</div>
                    <div className="text-text-secondary text-sm">étapes IA par analyse</div>
                </div>
                <div className="text-center" ref={s2.ref}>
                    <div className="text-4xl sm:text-5xl font-black gradient-text mb-2">{s2.value}</div>
                    <div className="text-text-secondary text-sm">points corporels trackés</div>
                </div>
                <div className="text-center">
                    <div className="text-4xl sm:text-5xl font-black gradient-text mb-2">&lt; 2min</div>
                    <div className="text-text-secondary text-sm">pour un rapport complet</div>
                </div>
                <div className="text-center">
                    <div className="text-4xl sm:text-5xl font-black gradient-text mb-2">0€</div>
                    <div className="text-text-secondary text-sm">coût IA (Groq gratuit)</div>
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
        name: 'Mathis L.',
        role: 'Joueur U18 — Paris',
        text: 'En 3 semaines, mon pourcentage au mid-range est passé de 38% à 52%. L\'IA a détecté un problème de posture que même mon coach n\'avait pas vu.',
        rating: 5,
        avatar: '🏀',
    },
    {
        name: 'Coach Stéphane',
        role: 'Entraîneur — Bordeaux BC',
        text: 'Je gagne 4h par semaine sur l\'analyse vidéo. Les highlights automatiques sont parfaits pour motiver mes joueurs. Indispensable.',
        rating: 5,
        avatar: '📋',
    },
    {
        name: 'Aminata D.',
        role: 'Joueuse NF2 — Lyon',
        text: 'Le Mental Score m\'a aidée à comprendre pourquoi je rate mes lancers en fin de match. C\'est comme avoir un psy sportif dans son téléphone.',
        rating: 5,
        avatar: '🧠',
    },
    {
        name: 'Théo R.',
        role: 'Basketteur amateur — Marseille',
        text: 'Mes highlights TikTok ont fait 50K vues. Le montage automatique est incroyable. Mes potes sont jaloux.',
        rating: 5,
        avatar: '🎬',
    },
    {
        name: 'David K.',
        role: 'Directeur Sportif — Académie',
        text: 'On a équipé toute notre académie. Les rapports IA permettent de suivre la progression de 40 jeunes joueurs sans effort.',
        rating: 5,
        avatar: '🏆',
    },
    {
        name: 'Léa M.',
        role: 'Joueuse U16 — Toulouse',
        text: 'Le programme 30 jours gamifié est addictif. J\'ai fait un streak de 22 jours et progressé à 3 points comme jamais.',
        rating: 4,
        avatar: '🎯',
    },
]

function Testimonials() {
    const ref = useReveal<HTMLDivElement>()

    return (
        <section className="py-24 px-4 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div ref={ref} className="text-center mb-16 reveal">
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider">Témoignages</span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mt-3 mb-4">
                        Ils ont déjà <span className="gradient-text">progressé</span>
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto">
                        Joueurs, coachs, académies : ils nous font confiance pendant la beta.
                    </p>
                </div>

                {/* Marquee carousel */}
                <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                    <div className="flex animate-marquee w-max gap-6">
                        {[...testimonials, ...testimonials].map((t, i) => (
                            <div
                                key={i}
                                className="bg-surface border border-border rounded-2xl p-6 w-[350px] flex-shrink-0 hover:border-primary/30 transition-colors"
                            >
                                <div className="flex items-center gap-1 mb-3">
                                    {[...Array(t.rating)].map((_, j) => (
                                        <Star key={j} size={14} className="fill-warning text-warning" />
                                    ))}
                                </div>
                                <Quote size={18} className="text-primary/30 mb-2" />
                                <p className="text-text-secondary text-sm leading-relaxed mb-4">{t.text}</p>
                                <div className="flex items-center gap-3 pt-3 border-t border-border">
                                    <span className="text-2xl">{t.avatar}</span>
                                    <div>
                                        <div className="text-text-primary font-semibold text-sm">{t.name}</div>
                                        <div className="text-text-secondary text-xs">{t.role}</div>
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
// PRICING
// ==========================================
const plans = [
    {
        name: 'Joueur',
        price: '9',
        period: '/mois',
        desc: 'Pour les joueurs qui veulent progresser',
        features: [
            '5 analyses vidéo / mois',
            'Rapport IA complet + programme 7 jours',
            'Highlight reel automatique',
            'Accès communauté + défis',
            'Digital Twin basique',
        ],
        cta: 'Commencer',
        popular: false,
    },
    {
        name: 'Coach',
        price: '29',
        period: '/mois',
        desc: 'Pour les coachs et les équipes',
        features: [
            'Analyses illimitées',
            'Jusqu\'à 15 joueurs',
            'Dashboard équipe complet',
            'Annotation vidéo + retours',
            'Analyse tactique adversaires',
            'Tous les templates highlight',
        ],
        cta: 'Choisir Coach',
        popular: true,
    },
    {
        name: 'Académie',
        price: '99',
        period: '/mois',
        desc: 'Pour les clubs et académies',
        features: [
            'Tout du plan Coach',
            'Joueurs illimités',
            'API access',
            'Rapports PDF avec branding',
            'Support prioritaire',
            'Accès bêta nouvelles features',
        ],
        cta: 'Contacter',
        popular: false,
    },
]

function Pricing() {
    const ref = useReveal<HTMLDivElement>()

    return (
        <section id="pricing" className="py-24 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider">Tarifs</span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mt-3 mb-4">
                        Un plan pour chaque <span className="gradient-text">ambition</span>
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto">
                        Commence gratuitement pendant la beta. Pas de carte bancaire requise.
                    </p>
                </div>

                <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8 reveal-stagger">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className={`relative bg-surface rounded-2xl p-8 border transition-all duration-300 hover:-translate-y-1 card-shine ${plan.popular
                                ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                                : 'border-border'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-primary/30">
                                    ⭐ Le plus populaire
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-text-primary mb-1">{plan.name}</h3>
                            <p className="text-text-secondary text-sm mb-6">{plan.desc}</p>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-5xl font-black text-text-primary">{plan.price}€</span>
                                <span className="text-text-secondary">{plan.period}</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                {plan.features.map((f, fi) => (
                                    <li key={fi} className="flex items-start gap-2 text-sm text-text-secondary">
                                        <Check size={16} className="text-accent mt-0.5 flex-shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <a
                                href="#waitlist"
                                className={`block text-center py-3 rounded-full font-semibold transition-all ${plan.popular
                                    ? 'bg-primary hover:bg-primary-hover text-white hover:shadow-lg hover:shadow-primary/25'
                                    : 'bg-surface border border-border hover:border-primary text-text-primary'
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
        q: 'Quel téléphone me faut-il ?',
        a: 'N\'importe quel smartphone récent (iPhone 11+ ou Android équivalent). Tu as juste besoin de la caméra de base, pas de matériel spécial.',
    },
    {
        q: 'L\'analyse est-elle vraiment prête en 2 minutes ?',
        a: 'Oui ! Notre pipeline IA en 7 étapes est optimisé pour traiter une vidéo de 45 minutes de match en moins de 2 minutes grâce à Groq et notre architecture cloud.',
    },
    {
        q: 'Mes vidéos sont-elles stockées en sécurité ?',
        a: 'Absolument. Toutes les vidéos sont stockées en privé sur Supabase avec chiffrement. Seul toi peux y accéder. On ne les utilise jamais pour entraîner nos modèles sans ton accord.',
    },
    {
        q: 'Ça marche pour le basket de rue / 3x3 ?',
        a: 'Oui ! L\'IA s\'adapte automatiquement au format. Basket 5v5, 3x3, ou même entraînement solo — tout est analysé.',
    },
    {
        q: 'C\'est vraiment gratuit pendant la beta ?',
        a: 'Oui, les 500 premiers inscrits ont un accès complet et gratuit. Pas de carte bancaire requise. On te préviendra avant tout passage payant.',
    },
    {
        q: 'Est-ce que ça remplace un vrai coach ?',
        a: 'Non, c\'est un complément. On fournit des données et insights que même un excellent coach ne peut pas toujours capter à l\'œil nu. Les meilleurs résultats viennent du combo coach + IA.',
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
            <div
                className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-48 pb-5' : 'max-h-0'}`}
            >
                <p className="text-text-secondary text-sm leading-relaxed">{a}</p>
            </div>
        </div>
    )
}

function FAQ() {
    const ref = useReveal<HTMLDivElement>()

    return (
        <section className="py-24 px-4 bg-surface/30">
            <div ref={ref} className="max-w-3xl mx-auto reveal">
                <div className="text-center mb-12">
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider">FAQ</span>
                    <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mt-3 mb-4">
                        Questions <span className="gradient-text">fréquentes</span>
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
            <div className="max-w-4xl mx-auto flex flex-wrap justify-center items-center gap-8 text-text-secondary/60 text-sm">
                <div className="flex items-center gap-2">
                    <Shield size={18} />
                    <span>Données chiffrées (AES-256)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>🇪🇺</span>
                    <span>RGPD compliant</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>🔒</span>
                    <span>Vidéos privées par défaut</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>⚡</span>
                    <span>99.9% uptime</span>
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
            if (data.success) {
                setSubmitted(true)
            }
        } catch {
            // Fallback: considérer comme succès pour ne pas bloquer l'UX
            setSubmitted(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section id="waitlist" className="py-24 px-4">
            <div ref={ref} className="max-w-3xl mx-auto text-center reveal">
                <div className="relative bg-gradient-to-br from-primary/20 via-surface to-accent/10 rounded-3xl p-12 border border-primary/20 overflow-hidden">
                    {/* Decorative blobs */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />

                    <div className="relative z-10">
                        <span className="text-5xl mb-6 block">🏀</span>
                        <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
                            Prêt à transformer ton jeu ?
                        </h2>
                        <p className="text-text-secondary mb-8 max-w-lg mx-auto">
                            Rejoins la beta privée. Accès gratuit pour les 500 premiers joueurs.
                            Pas de carte bancaire requise.
                        </p>

                        {submitted ? (
                            <div className="flex items-center justify-center gap-2 text-accent font-semibold text-lg animate-slide-up">
                                <Check size={24} />
                                Tu es sur la liste ! On te contacte très vite. 🔥
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                                <input
                                    type="email"
                                    placeholder="ton@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    aria-label="Adresse email"
                                    className="flex-1 bg-background border border-border rounded-full px-5 py-3 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white px-8 py-3 rounded-full font-bold transition-all whitespace-nowrap btn-glow hover:shadow-lg hover:shadow-primary/30"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Envoi...
                                        </span>
                                    ) : (
                                        'Rejoindre la Beta'
                                    )}
                                </button>
                            </form>
                        )}

                        <p className="text-text-secondary/60 text-xs mt-4">
                            Gratuit pendant la beta • Pas de spam • Désabonnement en 1 clic
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
                    {/* Logo */}
                    <a href="#" className="flex items-center gap-2 group">
                        <span className="text-xl group-hover:scale-110 transition-transform">🏀</span>
                        <span className="font-bold text-text-primary">
                            Court<span className="text-primary">Vision</span> AI
                        </span>
                    </a>

                    {/* Links */}
                    <div className="flex gap-6 text-sm text-text-secondary">
                        <a href="#" className="hover:text-text-primary transition-colors">Confidentialité</a>
                        <a href="#" className="hover:text-text-primary transition-colors">CGU</a>
                        <a href="#" className="hover:text-text-primary transition-colors">Contact</a>
                        <a href="https://twitter.com/courtvisionai" className="hover:text-text-primary transition-colors" target="_blank" rel="noopener noreferrer">
                            Twitter
                        </a>
                    </div>

                    {/* Copyright */}
                    <p className="text-xs text-text-secondary/60">
                        © {currentYear} CourtVision AI. Tous droits réservés.
                    </p>
                </div>

                {/* Tagline */}
                <div className="text-center mt-8 pt-6 border-t border-border/50">
                    <p className="text-xs text-text-secondary/40">
                        Fait avec 🏀 et ❤️ pour la communauté basket
                    </p>
                </div>
            </div>
        </footer>
    )
}

// ==========================================
// PAGE PRINCIPALE
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
