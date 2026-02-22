import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

const CHALLENGES = [
    { id: '1', title: 'Meilleur % de 3pts', metric: '3pt %', timeLeft: '2j 14h', myRank: 4, leader: 'Kylian B.', leaderValue: '58%', myValue: '41%', reward: '🏆 Badge "Sniper"' },
    { id: '2', title: 'Max de matches filmés', metric: 'Sessions', timeLeft: '4j 09h', myRank: 1, leader: 'Toi', leaderValue: '7', myValue: '7', reward: '🔥 +50 XP' },
    { id: '3', title: 'Mental Score le plus stable', metric: 'Mental Score', timeLeft: '1j 02h', myRank: 12, leader: 'Younes R.', leaderValue: '94', myValue: '71', reward: '🧠 Badge "Ice"' }
]

const LEADERBOARD = [
    { rank: 1, name: 'Kylian B.', score: 94, position: 'PG', trend: '↑' },
    { rank: 2, name: 'Amine O.', score: 88, position: 'SG', trend: '↑' },
    { rank: 3, name: 'Soufiane D.', score: 85, position: 'SF', trend: '—' },
    { rank: 4, name: 'Toi', score: 79, position: 'PG', trend: '↑', isMe: true },
    { rank: 5, name: 'Rachid M.', score: 74, position: 'PF', trend: '↓' }
]

export default function Community() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'challenges'>('leaderboard')

    const tabStyle = (tab: string) => ({
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center' as const,
        borderBottomWidth: 2,
        borderBottomColor: activeTab === tab ? '#1A73E8' : 'transparent'
    })

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header */}
                <View style={{ padding: 20 }}>
                    <Text style={{ color: '#E6EDF3', fontSize: 26, fontWeight: 'bold' }}>Communauté</Text>
                    <Text style={{ color: '#8B949E', fontSize: 14, marginTop: 4 }}>Le Strava du basket 🏀</Text>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#161B22', marginHorizontal: 20, marginBottom: 20 }}>
                    <TouchableOpacity style={tabStyle('leaderboard')} onPress={() => setActiveTab('leaderboard')}>
                        <Text style={{ color: activeTab === 'leaderboard' ? '#1A73E8' : '#8B949E', fontWeight: '600' }}>Classement</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={tabStyle('challenges')} onPress={() => setActiveTab('challenges')}>
                        <Text style={{ color: activeTab === 'challenges' ? '#1A73E8' : '#8B949E', fontWeight: '600' }}>Défis ({CHALLENGES.length})</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'leaderboard' && (
                    <View style={{ paddingHorizontal: 20 }}>
                        {/* Filtre scope */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                            {['Global', 'Amis', 'Région'].map(scope => (
                                <TouchableOpacity key={scope} style={{ backgroundColor: scope === 'Global' ? '#1A73E8' : '#161B22', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10 }}>
                                    <Text style={{ color: '#E6EDF3', fontWeight: '600' }}>{scope}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {LEADERBOARD.map(player => (
                            <View
                                key={player.rank}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: player.isMe ? 'rgba(26,115,232,0.15)' : '#161B22',
                                    borderRadius: 15,
                                    padding: 15,
                                    marginBottom: 10,
                                    borderWidth: player.isMe ? 1 : 0,
                                    borderColor: '#1A73E8'
                                }}
                            >
                                <Text style={{ color: player.rank <= 3 ? '#FFB300' : '#8B949E', fontWeight: 'bold', fontSize: 18, width: 30 }}>#{player.rank}</Text>
                                <View style={{ width: 45, height: 45, backgroundColor: '#8B949E', borderRadius: 22, marginHorizontal: 12 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#E6EDF3', fontWeight: 'bold', fontSize: 16 }}>{player.name}</Text>
                                    <Text style={{ color: '#8B949E', fontSize: 12 }}>{player.position}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: '#00D4FF', fontWeight: 'bold', fontSize: 18 }}>{player.score}</Text>
                                    <Text style={{ color: player.trend === '↑' ? '#00C853' : player.trend === '↓' ? '#FF3D57' : '#8B949E' }}>{player.trend}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {activeTab === 'challenges' && (
                    <View style={{ paddingHorizontal: 20 }}>
                        {CHALLENGES.map(challenge => (
                            <View key={challenge.id} style={{ backgroundColor: '#161B22', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: challenge.myRank === 1 ? '#00C853' : '#161B22' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <Text style={{ color: '#E6EDF3', fontWeight: 'bold', fontSize: 16 }}>{challenge.title}</Text>
                                    <View style={{ backgroundColor: '#FF3D57', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>⏱ {challenge.timeLeft}</Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <View>
                                        <Text style={{ color: '#8B949E', fontSize: 12 }}>🥇 Leader</Text>
                                        <Text style={{ color: '#FFB300', fontSize: 15, fontWeight: 'bold' }}>{challenge.leader} — {challenge.leaderValue}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: '#8B949E', fontSize: 12 }}>Toi — #{challenge.myRank}</Text>
                                        <Text style={{ color: '#00D4FF', fontSize: 15, fontWeight: 'bold' }}>{challenge.myValue}</Text>
                                    </View>
                                </View>

                                <Text style={{ color: '#8B949E', fontSize: 12, marginBottom: 12 }}>Récompense : {challenge.reward}</Text>

                                <TouchableOpacity style={{ backgroundColor: '#1A73E8', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Participer</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}
