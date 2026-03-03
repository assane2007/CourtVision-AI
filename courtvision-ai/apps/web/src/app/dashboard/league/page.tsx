'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    Trophy,
    Crown,
    TrendingUp,
    Zap,
    Globe,
    ArrowUpRight,
    Users,
    Box
} from 'lucide-react'

// Mocking backend data fetch for leaderboard
const fetchLeaderboard = async () => {
    return new Promise<any>((resolve) => {
        setTimeout(() => {
            resolve({
                userRank: { rank: 4, name: 'Assane (YOU)', twin: 'User_442', points: '12,402', tier: 'PRIME', color: 'text-text-secondary' },
                leaders: [
                    { rank: 1, name: 'Apex_Baller', twin: 'LeBron Spec', points: '24,802', tier: 'APEX', color: 'text-fire' },
                    { rank: 2, name: 'Neural_Kobe', twin: 'Mamba v4', points: '22,410', tier: 'ELITE', color: 'text-ice' },
                    { rank: 3, name: 'DunkCloud', twin: 'Vince Spec', points: '21,950', tier: 'ELITE', color: 'text-ice' },
                    { rank: 4, name: 'Assane (YOU)', twin: 'User_442', points: '12,402', tier: 'PRIME', color: 'text-text-secondary' },
                ],
                nextTierPoints: 15000,
                regionalRank: '#22 (EUROPE)'
            });
        }, 1100);
    });
};

export default function LeaguePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        fetchLeaderboard().then(res => {
            if (mounted) {
                setData(res);
                setLoading(false);
            }
        });
        return () => { mounted = false; };
    }, []);

    const handleLoadFullRankings = () => {
        alert("Loading complete global leaderboard... Establishing secure connection.");
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <Trophy size={48} className="text-fire animate-bounce mx-auto opacity-50" />
                    <p className="font-mono text-text-tertiary uppercase tracking-[0.3em]">Syncing Shadow League Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="md:col-span-2 bg-gradient-to-br from-fire/20 to-void border border-fire/30 p-10 rounded-[40px] relative overflow-hidden flex flex-col justify-center"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Trophy size={200} className="text-fire" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-2 w-2 rounded-full bg-fire animate-ping" />
                            <p className="text-xs font-mono text-fire uppercase tracking-[0.4em]">SEASON 01 // NEURAL DOMINANCE</p>
                        </div>
                        <h1 className="text-5xl font-display font-black italic uppercase italic leading-tight">THE SHADOW <br /><span className="gradient-text">LEAGUE</span></h1>
                        <p className="text-text-secondary max-w-sm mt-4 font-mono text-xs uppercase tracking-widest leading-relaxed">
                            Your Digital Twin is currently ranked in the <span className="text-white font-bold">Top 15%</span> of global athletes.
                        </p>
                    </div>
                </motion.div>

                <div className="space-y-6">
                    <div className="bg-surface border border-white/5 p-8 rounded-[40px] flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-ice/10 border border-ice/20 rounded-full flex items-center justify-center mb-4">
                            <Crown className="text-ice" size={32} />
                        </div>
                        <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">NEXT TIER AT</p>
                        <p className="text-3xl font-display font-black italic mt-1">{data.nextTierPoints.toLocaleString()} <span className="text-sm font-mono text-ice">PTS</span></p>
                        <p className="text-[10px] font-mono text-ice uppercase tracking-widest mt-2">+{data.nextTierPoints - parseInt(data.userRank.points.replace(',', ''))} LEFT</p>
                    </div>
                    <div className="bg-surface border border-white/5 p-6 rounded-[40px] flex items-center gap-4">
                        <div className="bg-surface p-3 rounded-2xl"><Globe className="text-text-tertiary" size={24} /></div>
                        <div>
                            <p className="text-[10px] font-mono text-text-tertiary uppercase">REGIONAL RANK</p>
                            <p className="text-xl font-display font-black text-white italic tracking-tight">{data.regionalRank}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Leaderboard Table */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface backdrop-blur-md border border-white/5 rounded-[40px] overflow-hidden"
            >
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xl font-display font-black italic uppercase tracking-tight">Global <span className="text-fire">Neural</span> Ranking</h3>
                    <div className="flex gap-4">
                        <button className="text-[10px] font-mono text-fire border-b border-fire pb-1 uppercase tracking-widest">WORLDWIDE</button>
                        <button className="text-[10px] font-mono text-text-tertiary hover:text-white transition-colors uppercase tracking-widest">FRIENDS</button>
                    </div>
                </div>

                <div className="p-4">
                    {data.leaders.map((player: any, i: number) => (
                        <div
                            key={player.name}
                            className={`flex items-center justify-between p-6 rounded-[24px] transition-all cursor-pointer group ${player.name.includes('YOU') ? 'bg-fire/10 border border-fire/20' : 'hover:bg-surface'}`}
                        >
                            <div className="flex items-center gap-8">
                                <span className={`text-xl font-display font-black italic w-6 ${player.rank === 1 ? 'text-fire' : 'text-text-tertiary'}`}>
                                    {player.rank.toString().padStart(2, '0')}
                                </span>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-void border border-white/5 overflow-hidden flex items-center justify-center">
                                        <div className={`w-full h-full opacity-40 bg-gradient-to-br ${player.rank === 1 ? 'from-fire to-void' : 'from-ice to-void'}`} />
                                    </div>
                                    <div>
                                        <p className="font-display font-black italic text-white uppercase tracking-tight">{player.name}</p>
                                        <p className="text-[10px] font-mono text-text-tertiary uppercase">{player.twin}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-12">
                                <div className="text-right hidden sm:block">
                                    <p className={`text-[10px] font-mono uppercase tracking-widest ${player.color}`}>{player.tier} TIER</p>
                                    <p className="text-lg font-display font-black tracking-tight">{player.points} <span className="text-[10px] font-mono text-text-tertiary">PTS</span></p>
                                </div>
                                <ArrowUpRight className="text-text-tertiary group-hover:text-fire transition-colors" size={20} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-8 bg-void/30 flex justify-center">
                    <button onClick={handleLoadFullRankings} className="text-[10px] font-mono text-text-tertiary uppercase tracking-[0.4em] hover:text-fire transition-all">LOAD FULL RANKINGS</button>
                </div>
            </motion.div>
        </div>
    )
}
