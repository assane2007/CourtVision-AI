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
import { usePathname, useRouter } from 'next/navigation'

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
    const router = useRouter()

    const handleLogout = () => {
        alert("Signing out to main sequence...");
        router.push('/');
    };

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            alert(`Searching neural archives for: ${e.currentTarget.value}`);
        }
    };

    const handleNotifications = () => {
        alert("3 New Neural Load alerts and 1 Sync confirmation.");
    };

    const handleProfileClick = () => {
        router.push('/dashboard/profile');
    };

    return (
        <div className="min-h-screen bg-void text-text-primary flex overflow-hidden">
            {/* Sidebar */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ x: -280 }}
                        animate={{ x: 0 }}
                        exit={{ x: -280 }}
                        className="fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border-strong flex flex-col"
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
                                            ? 'bg-fire/10 text-fire border border-fire/20'
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

                        <div className="p-4 border-t border-border-strong">
                            <button onClick={handleLogout} className="flex items-center gap-4 w-full px-4 py-3 text-text-tertiary hover:text-fire hover:bg-fire/10 rounded-xl transition-all font-mono text-sm uppercase tracking-wider">
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
                <header className="h-20 bg-void/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-8 sticky top-0 z-40">
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
                                onKeyDown={handleSearch}
                                placeholder="SEARCH NEURAL DATA..."
                                className="bg-surface border border-border rounded-full py-2 pl-10 pr-6 text-xs font-mono tracking-widest focus:outline-none focus:border-fire/50 w-64 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button onClick={handleNotifications} className="relative p-2 text-text-secondary hover:text-fire transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-fire rounded-full animate-pulse" />
                        </button>
                        <div onClick={handleProfileClick} className="flex items-center gap-4 pl-6 border-l border-border cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-mono tracking-widest text-text-primary">M. ASSANE</p>
                                <p className="text-[10px] font-mono tracking-tighter text-fire uppercase">ELITE PLAYER</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center overflow-hidden">
                                <div className="w-full h-full bg-gradient-to-br from-fire to-ice opacity-50" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
