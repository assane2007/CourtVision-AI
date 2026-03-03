// Logging disabled/swapped to console for MVP

// Extracted Player DNA
export interface DigitalTwin {
    id: string;
    name: string;
    speedRating: number;         // 1-100
    releaseTimeMs: number;       // e.g. 500ms
    accuracyFatigued: number;    // %
    jumpHeightCm: number;        // e.g. 80cm
    defensiveContestSpeed: number; // 1-100
}

export interface SimulationResult {
    matchId: string;
    winnerId: string;
    score: {
        playerA: number;
        playerB: number;
    };
    report: string;
    timestamp: Date;
}

/**
 * Service to handle the math and generation for The Shadow League
 */
export class SimulationService {

    /**
     * Runs thousands of probabilistic micro-simulations to determine a macro winner.
     */
    static async simulateShadowMatch(playerA: DigitalTwin, playerB: DigitalTwin): Promise<SimulationResult> {
        console.log(`[Shadow League] Initiating simulation between ${playerA.name} and ${playerB.name}`);

        let winsA = 0;
        let winsB = 0;
        const totalMicroMatches = 1000;

        for (let i = 0; i < totalMicroMatches; i++) {
            // Algorithmic matchup logic (Simplified but robust)
            // Does Player A shoot faster than Player B can contest?
            const aAdvantage = (1000 - playerA.releaseTimeMs) * playerA.speedRating;
            const bContest = playerB.defensiveContestSpeed * playerB.jumpHeightCm;

            // Introduce RNG (Fatigue drop-off factor)
            const rngA = Math.random() * playerA.accuracyFatigued;
            const rngB = Math.random() * playerB.accuracyFatigued;

            const scoreA = (aAdvantage * rngA);
            const scoreB = (bContest * rngB);

            if (scoreA > scoreB) {
                winsA++;
            } else {
                winsB++;
            }
        }

        const aWinPercentage = (winsA / totalMicroMatches) * 100;
        const bWinPercentage = (winsB / totalMicroMatches) * 100;
        const winner = winsA > winsB ? playerA : playerB;
        const loser = winsA > winsB ? playerB : playerA;

        // "LLM" Mocked Generator 
        const mockReport = `Coach IA: Ton Digital Twin a simulé ${totalMicroMatches} matchups 1v1 contre le Digital Twin de ${loser.name} cette nuit. Tu as ${winner.id === playerA.id ? "gagné" : "perdu"} avec ${Math.max(aWinPercentage, bWinPercentage).toFixed(1)}% de réussite. Motif de l'échec/victoire : La différence de temps de tir jouait en la faveur de ${winner.name} (${winner.releaseTimeMs}ms). Voici un programme algorithmique pour contrer ça: +15 drills de Release sous pression minimum.`;

        const result: SimulationResult = {
            matchId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            winnerId: winner.id,
            score: {
                playerA: winsA,
                playerB: winsB
            },
            report: mockReport,
            timestamp: new Date()
        };

        // Simulate Heavy AI thinking delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log(`[Shadow League] Simulation complete. Winner: ${winner.name}`);
        return result;
    }
}
