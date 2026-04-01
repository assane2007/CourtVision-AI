'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
    User,
    Mail,
    Phone,
    Smartphone,
    CreditCard,
    ShieldCheck,
    Bell,
    ChevronRight,
    Camera
} from 'lucide-react'
import { apiRequest } from '@/services/api'

const sections = [
    { title: 'Personal Information', icon: User, fields: ['Full Name', 'Age', 'Height / Weight'] },
    { title: 'Biometric Devices', icon: Smartphone, fields: ['Apex HUD v2', 'Neural Sensor 01'] },
    { title: 'Security & Privacy', icon: ShieldCheck, fields: ['2FA Tracking', 'Data Encryption'] },
    { title: 'Subscription', icon: CreditCard, fields: ['Pro Athlete Tier'] },
]

export default function ProfilePage() {
    const [profile, setProfile] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
    const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
    const [isBillingLoading, setIsBillingLoading] = React.useState(false)
    const [billingMessage, setBillingMessage] = React.useState<string | null>(null)

    React.useEffect(() => {
        // Fetch profile data here in the future
        // Use a mock timeout for now to simulate loading if database is empty 
        // as we haven't wired up the full auth context yet.
        setTimeout(() => {
            setProfile({
                fullName: 'Assane',
                age: '24',
                height: '1.92m',
                weight: '88kg',
                hudVersion: 'Apex HUD v2.4.0',
                sensor: 'Neural Sensor 01',
                subscription: 'Pro Athlete Tier'
            });
            setLoading(false);
        }, 1000);
    }, []);

    const handleRefillData = async () => {
        setIsBillingLoading(true)
        setBillingMessage(null)
        try {
            const response = await apiRequest<{ url?: string }>('/billing/portal')
            if (!response?.url) {
                throw new Error('Billing portal URL unavailable')
            }
            window.location.href = response.url
        } catch (error: any) {
            setBillingMessage(error.message || 'Unable to open billing portal right now.')
        } finally {
            setIsBillingLoading(false)
        }
    }

    const handleOpenAvatarPicker = () => {
        avatarInputRef.current?.click();
    };

    const handleAvatarSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setAvatarPreview(reader.result);
            }
        };
        reader.readAsDataURL(file);
        event.currentTarget.value = '';
    };

    const sectionsData = React.useMemo(() => [
        { title: 'Personal Information', icon: User, fields: [profile?.fullName || '---', `${profile?.age || '--'} YRS`, `${profile?.height || '--'} / ${profile?.weight || '--'}`] },
        { title: 'Biometric Devices', icon: Smartphone, fields: [profile?.hudVersion || '---', profile?.sensor || '---'] },
        { title: 'Security & Privacy', icon: ShieldCheck, fields: ['2FA Active', 'E2E Encryption'] },
        { title: 'Subscription', icon: CreditCard, fields: [profile?.subscription || '---'] },
    ], [profile]);

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            {/* Header / Avatar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-8"
            >
                <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-fire to-ice p-[1px] shadow-2xl shadow-fire/10">
                        <div
                            className="w-full h-full bg-surface rounded-[23px] flex items-center justify-center overflow-hidden"
                            style={avatarPreview
                                ? {
                                    backgroundImage: `url(${avatarPreview})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }
                                : undefined
                            }
                        >
                            {!avatarPreview && (
                                <div className="text-4xl text-white font-black italic">{profile ? profile.fullName.charAt(0) : ''}</div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleOpenAvatarPicker}
                        className="absolute -bottom-2 -right-2 p-2 bg-fire rounded-xl text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <Camera size={18} />
                    </button>
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarSelected}
                    />
                </div>
                <div>
                    <h1 className="text-4xl font-display font-black italic uppercase italic">{loading ? 'LOADING...' : profile?.fullName}</h1>
                    <p className="text-fire font-mono text-xs uppercase tracking-widest mt-1">ELITE ATHLETE // SQUAD 442</p>
                </div>
            </motion.div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {sectionsData.map((section, i) => (
                    <motion.div
                        key={section.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-surface backdrop-blur-md border border-white/5 p-8 rounded-[40px] group hover:border-fire/20 transition-all"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-surface rounded-2xl text-text-tertiary group-hover:text-fire transition-colors">
                                <section.icon size={20} />
                            </div>
                            <h3 className="font-display font-black italic uppercase text-lg tracking-tight">{section.title}</h3>
                        </div>

                        <div className="space-y-4">
                            {section.fields.map((field, index) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                    <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">{field}</span>
                                    <ChevronRight size={14} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Elite Perks Banner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-fire/10 border border-fire/30 p-8 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6"
            >
                <div className="text-center md:text-left">
                    <p className="text-xs font-mono text-fire uppercase tracking-[0.4em] mb-2">PRO ATHLETE PERKS</p>
                    <p className="text-lg font-display font-black text-white italic uppercase">You have 4 premium simulations remaining this month.</p>
                </div>
                <button
                    onClick={handleRefillData}
                    disabled={isBillingLoading}
                    className="bg-fire text-white px-8 py-3 rounded-2xl font-bold font-mono text-xs uppercase tracking-widest hover:bg-fire-hover transition-all shadow-lg shadow-fire/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isBillingLoading ? 'OPENING PORTAL...' : 'REFILL DATA'}
                </button>
            </motion.div>

            {billingMessage && (
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-4">
                    <p className="text-xs font-mono uppercase tracking-widest text-yellow-300">Billing</p>
                    <p className="mt-1 text-sm text-yellow-200">{billingMessage}</p>
                </div>
            )}
        </div>
    )
}
