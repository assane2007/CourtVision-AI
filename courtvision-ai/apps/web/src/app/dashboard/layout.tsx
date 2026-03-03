'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    Video,
    Trophy,
    User,
    Settings,
    LogOut,
    Menu,
    X,
    Search,
    Bell,
    Cpu
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
    { name: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Sessions', icon: Video, href: '/dashboard/sessions' },
    { name: 'Shadow League', icon: Trophy, href: '/dashboard/league' },
    { name: 'Digital Twin', icon: Cpu, href: '/dashboard/twin' },
    { name: 'Profile', icon: User, href: '/dashboard/profile' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const pathname = usePathname()

    return (
        <div className="min-h-screen bg-void text-text-primary flex overflow-hidden">
            {/* Sidebar */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ x: -280 }}
                        animate={{ x: 0 }}
                        exit={{ x: -280 }}
                        className="fixed inset-y-0 left-0 z-50 w-72 bg-surface backdrop-blur-2xl border-r border-white/5 flex flex-col"
                    >
                        <div className="p-8 flex items-center justify-between">
                            <Link href="/" className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-fire rounded flex items-center justify-center font-display font-black italic shadow-lg shadow-fire/20">C</div>
                                <span className="text-xl font-display font-black tracking-tighter uppercase italic">CourtVision</span>
                            </Link>
                            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-text-tertiary hover:text-fire transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="flex-1 px-4 py-4 space-y-2">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive
                                                ? 'bg-fire/10 text-fire border border-fire/20 shadow-lg shadow-fire/5'
                                                : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                                            }`}
                                    >
                                        <item.icon size={20} className={isActive ? 'text-fire' : 'text-text-tertiary group-hover:text-fire transition-colors'} />
                                        <span className="font-mono text-sm uppercase tracking-wider">{item.name}</span>
                                        {isActive && <motion.div layoutId="active" className="ml-auto w-1 h-4 bg-fire rounded-full" />}
                                    </Link>
                                )
                            })}
                        </nav>

                        <div className="p-4 border-t border-white/5">
                            <button className="flex items-center gap-4 w-full px-4 py-3 text-text-tertiary hover:text-fire hover:bg-fire/10 rounded-xl transition-all font-mono text-sm uppercase tracking-wider">
                                <LogOut size={20} />
                                <span>Logout</span>
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'pl-72' : 'pl-0'}`}>
                {/* Header */}
                <header className="h-20 bg-void/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div className="flex items-center gap-6">
                        {!isSidebarOpen && (
                            <button onClick={() => setIsSidebarOpen(true)} className="text-text-secondary hover:text-fire transition-colors">
                                <Menu size={24} />
                            </button>
                        )}
                        <div className="relative group hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-fire transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="SEARCH NEURAL DATA..."
                                className="bg-void/50 border border-white/10 rounded-full py-2 pl-10 pr-6 text-xs font-mono tracking-widest focus:outline-none focus:border-fire/50 w-64 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-fire/10 border border-fire/20 rounded-full px-3 py-1.5">
                            <Cpu size={14} className="text-fire animate-pulse" />
                            <span className="text-[10px] font-mono text-fire uppercase tracking-widest">Neural Link: ACTIVE</span>
                        </div>

                        <button className="relative p-2 text-text-secondary hover:text-fire transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-fire rounded-full animate-pulse" />
                        </button>

                        <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-mono tracking-widest text-text-primary">M. ASSANE</p>
                                <p className="text-[10px] font-mono tracking-tighter text-fire uppercase">ELITE ATHLETE</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fire to-fire-hover p-[1px] shadow-lg shadow-fire/20">
                                <div className="w-full h-full bg-surface rounded-[11px] flex items-center justify-center overflow-hidden">
                                    <div className="text-white font-black italic">A</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>

            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-fire/5 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-ice/5 blur-[150px] rounded-full" />
            </div>
        </div>
    )
}
