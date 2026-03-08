/**
 * Session Data Fixture — For PDF report and analysis tests
 *
 * Represents a complete basketball session with all
 * the data points used across the application.
 */
export const mockSessionData = {
    id: 'session-fixture-001',
    userId: 'user-fixture-001',
    createdAt: new Date('2025-01-15T10:30:00Z'),
    duration: 3600,
    apexScore: 78.5,
    grade: 'B+',
    shotsMade: 42,
    shotsAttempted: 67,
    fgPercentage: 62.7,
    threePtMade: 8,
    threePtAttempted: 18,
    mentalScore: 71,
    fragilityScore: 29,
    fatigueScore: 45,
    shotAnalysis: {
        zones: {
            paint: { made: 18, attempted: 22 },
            midRange: { made: 16, attempted: 28 },
            threePoint: { made: 8, attempted: 17 }
        },
        shotDNA: { purityScore: 84, dominantStyle: 'Pull-Up Jumper' }
    },
    highlights: [
        { timestamp: 245, type: 'three_pointer', score: 90 },
        { timestamp: 1823, type: 'dunk', score: 95 }
    ],
    insights: [
        'Ton taux depuis le corner gauche (78%) est exceptionnel.',
        'Légère détérioration biomécanique après 45 min de jeu.',
        'Score mental stable sous pression — top 15% de la plateforme.'
    ]
}

/**
 * Mock Supabase data as it would be returned from the database
 */
export const mockDbSession = {
    id: 'session-fixture-001',
    user_id: 'user-fixture-001',
    created_at: '2025-01-15T10:30:00Z',
    duration_seconds: 3600,
    status: 'complete',
    location: 'Downtown Court',
    type: 'practice',
}

export const mockDbUser = {
    username: 'player1',
    full_name: 'Test Player',
    position: 'SG',
    avatar_url: 'https://cdn.courtvision.ai/avatars/player1.jpg',
}

export const mockDbAnalysis = {
    id: 'analysis-001',
    session_id: 'session-fixture-001',
    summary: 'Strong shooting session with excellent form consistency.',
    key_findings: ['High accuracy from mid-range', 'Consistent release point'],
    form_score: 85,
    consistency_score: 78,
}

export const mockDbShots = [
    { id: 's1', session_id: 'session-fixture-001', result: 'made', zone: 'paint', court_x: 50, court_y: 80, timestamp: 120, distance: 5 },
    { id: 's2', session_id: 'session-fixture-001', result: 'missed', zone: 'mid_range', court_x: 30, court_y: 50, timestamp: 245, distance: 15 },
    { id: 's3', session_id: 'session-fixture-001', result: 'made', zone: '3pt_left', court_x: 10, court_y: 30, timestamp: 400, distance: 24 },
    { id: 's4', session_id: 'session-fixture-001', result: 'made', zone: 'paint', court_x: 55, court_y: 85, timestamp: 600, distance: 4 },
    { id: 's5', session_id: 'session-fixture-001', result: 'missed', zone: '3pt_right', court_x: 90, court_y: 30, timestamp: 800, distance: 25 },
]

export const mockDbApexScore = {
    user_id: 'user-fixture-001',
    overall: 78,
    shooting: 82,
    mental: 71,
    consistency: 75,
    clutch: 68,
    improvement: 85,
    grade: 'A-',
    created_at: '2025-01-15T11:00:00Z',
}
