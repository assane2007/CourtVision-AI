'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
    User,
    Smartphone,
    CreditCard,
    ShieldCheck,
    ChevronRight,
    Camera
} from 'lucide-react'
import { apiRequest } from '@/services/api'
import { useAuth } from '@/lib/auth/authContext'

type AuthMeData = {
    id: string
    email?: string | null
    username?: string | null
    full_name?: string | null
    position?: string | null
    plan?: string | null
    created_at?: string | null
}

type AuthMeResponse = {
    success?: boolean
    data?: AuthMeData
}

type CommunityProfile = {
    user_id: string
    username?: string | null
    full_name?: string | null
    avatar_url?: string | null
    position?: string | null
    bio?: string | null
    location?: string | null
    team?: string | null
    xp?: number
    level?: number
    total_sessions?: number
    avg_shooting_pct?: number
    followers_count?: number
    following_count?: number
}

type ProfileView = {
    id: string
    fullName: string
    username: string
    email: string
    position: string
    team: string
    location: string
    level: number
    xp: number
    totalSessions: number
    avgShootingPct: number
    followers: number
    following: number
    subscription: string
    joinedAt: string
}

export default function ProfilePage() {
    const { user } = useAuth()
    const [profile, setProfile] = React.useState<ProfileView | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [loadError, setLoadError] = React.useState<string | null>(null)
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null)
    const avatarInputRef = React.useRef<HTMLInputElement | null>(null)
    const [isBillingLoading, setIsBillingLoading] = React.useState(false)
    const [billingMessage, setBillingMessage] = React.useState<string | null>(null)

    React.useEffect(() => {
        let mounted = true

        const loadProfile = async () => {
            setLoading(true)
            setLoadError(null)

            try {
                const me = await apiRequest<AuthMeResponse>('/auth/me')
                const meData = me?.data
                if (!meData?.id) {
                    throw new Error('Authenticated profile unavailable.')
                }

                let community: CommunityProfile | null = null
                try {
                    community = await apiRequest<CommunityProfile>(`/community/profile/${meData.id}`)
                } catch {
                    // Keep rendering with auth/me payload when community profile is not ready.
                }

                const fullName = community?.full_name || meData.full_name || user?.user_metadata?.full_name || 'Athlete'
                const username = community?.username || meData.username || user?.email?.split('@')[0] || 'player'

                const nextProfile: ProfileView = {
                    id: meData.id,
                    fullName,
                    username,
                    email: meData.email || user?.email || 'not-available',
                    position: community?.position || meData.position || 'N/A',
                    team: community?.team || 'Not set',
                    location: community?.location || 'Not set',
                    level: Number(community?.level ?? 1),
                    xp: Number(community?.xp ?? 0),
                    totalSessions: Number(community?.total_sessions ?? 0),
                    avgShootingPct: Number(community?.avg_shooting_pct ?? 0),
                    followers: Number(community?.followers_count ?? 0),
                    following: Number(community?.following_count ?? 0),
                    subscription: (meData.plan || 'free').toUpperCase(),
                    joinedAt: meData.created_at
                        ? new Date(meData.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric',
                        })
                        : '--',
                }

                if (!mounted) return
                setProfile(nextProfile)
            } catch (error: any) {
                if (!mounted) return
                setLoadError(error.message || 'Unable to load profile data.')

                if (user) {
                    setProfile({
                        id: user.id,
                        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Athlete',
                        username: user.email?.split('@')[0] || 'player',
                        email: user.email || 'not-available',
                        position: 'N/A',
                        team: 'Not set',
                        location: 'Not set',
                        level: 1,
                        xp: 0,
                        totalSessions: 0,
                        avgShootingPct: 0,
                        followers: 0,
                        following: 0,
                        subscription: 'FREE',
                        joinedAt: '--',
                    })
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        void loadProfile()

        return () => {
            mounted = false
        }
    }, [user])

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

    const sectionsData = React.useMemo(() => {
        const avgFgLabel = profile ? `${profile.avgShootingPct.toFixed(1)}% FG` : '--'

        return [
            {
                title: 'Personal Information',
                icon: User,
                fields: [profile?.fullName || '---', `@${profile?.username || '--'}`, profile?.email || '--'],
            },
            {
                title: 'Player Profile',
                icon: Smartphone,
                fields: [profile?.position || 'N/A', profile?.team || 'Not set', profile?.location || 'Not set'],
            },
            {
                title: 'Performance',
                icon: ShieldCheck,
                fields: [
                    `Level ${profile?.level ?? 1}`,
                    `${profile?.xp ?? 0} XP`,
                    avgFgLabel,
                ],
            },
            {
                title: 'Subscription',
                icon: CreditCard,
                fields: [profile?.subscription || 'FREE', `Sessions: ${profile?.totalSessions ?? 0}`],
            },
        ]
    }, [profile])

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
                    <p className="text-fire font-mono text-xs uppercase tracking-widest mt-1">
                        LEVEL {profile?.level ?? 1} // {profile?.position || 'PLAYER'}
                    </p>
                </div>
            </motion.div>

            {loadError && (
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-4">
                    <p className="text-xs font-mono uppercase tracking-widest text-yellow-300">Profile</p>
                    <p className="mt-1 text-sm text-yellow-200">{loadError}</p>
                </div>
            )}

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
                    <p className="text-lg font-display font-black text-white italic uppercase">
                        FOLLOWERS: {profile?.followers ?? 0} // FOLLOWING: {profile?.following ?? 0}
                    </p>
                    <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest mt-2">
                        Joined: {profile?.joinedAt ?? '--'}
                    </p>
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
