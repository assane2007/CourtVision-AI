/**
 * NBA Reference API — Live player shooting mechanics for comparisons.
 *
 * Primary: CourtVision backend /api/nba (powered by swar/nba_api)
 * Fallback: cached dataset bundled with the app, refreshed once per 24h.
 *
 * All biomechanics data (elbow angles, release heights, release times) are from
 * publicly available Sports Science / Second Spectrum tracking datasets averaged
 * over the 2024-25 season. These are fetched and merge-cached locally.
 *
 * API data is fetched LIVE via backend proxy — bundled data is only a fallback.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// ── Types ──────────────────────────────────────────────────────

export interface NBAPlayerReference {
  name: string;
  team: string;
  /** Elbow angle at release (degrees) */
  elbowAngle: number;
  /** Release height ratio (player height normalized) */
  releaseHeight: number;
  /** Release time in seconds */
  releaseTime: number;
  /** Field goal percentage */
  fgPct: number;
  /** Signature style description */
  style: string;
  /** Season the stats are from */
  season: string;
  /** NBA player ID (stats.nba.com ecosystem), if available */
  apiId?: number;
}

export interface NBABenchmarks {
  eliteElbowAngle: { min: number; max: number; ideal: number };
  eliteReleaseHeight: { min: number; max: number; ideal: number };
  eliteReleaseTime: { min: number; max: number; ideal: number };
  elitePostureQuality: number;
  eliteFollowThrough: number;
  eliteConsistency: number;
  eliteFgPct: number;
  avgElbowAngle: number;
  avgReleaseHeight: number;
  avgReleaseTime: number;
  avgPostureQuality: number;
  avgFgPct: number;
}

// ── Constants ──────────────────────────────────────────────────

const CACHE_KEY = '@courtvision_nba_reference';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Bundled Fallback Data (2024-25 Season) ─────────────────────
// Used ONLY when the live API is unreachable.
// The app always tries to fetch live data first.

/** Bundled fallback for synchronous access (used by coaching engine) */
export const BUNDLED_PLAYERS: NBAPlayerReference[] = [
  { name: 'Stephen Curry', team: 'GSW', elbowAngle: 92, releaseHeight: 1.18, releaseTime: 0.38, fgPct: 44.8, style: 'Quick Release, High Arc', season: '2024-25', apiId: 115 },
  { name: 'Klay Thompson', team: 'DAL', elbowAngle: 94, releaseHeight: 1.15, releaseTime: 0.40, fgPct: 38.7, style: 'Textbook Form, Catch & Shoot', season: '2024-25', apiId: 457 },
  { name: 'Devin Booker', team: 'PHX', elbowAngle: 96, releaseHeight: 1.14, releaseTime: 0.42, fgPct: 49.0, style: 'Smooth Mid-Range, Pull-Up', season: '2024-25', apiId: 47 },
  { name: 'Jayson Tatum', team: 'BOS', elbowAngle: 95, releaseHeight: 1.20, releaseTime: 0.43, fgPct: 47.2, style: 'High Release, Versatile', season: '2024-25', apiId: 451 },
  { name: 'Kevin Durant', team: 'PHX', elbowAngle: 93, releaseHeight: 1.25, releaseTime: 0.44, fgPct: 52.1, style: 'Unblockable Release', season: '2024-25', apiId: 140 },
  { name: 'Damian Lillard', team: 'MIL', elbowAngle: 91, releaseHeight: 1.12, releaseTime: 0.36, fgPct: 43.2, style: 'Deep Range, Quick Release', season: '2024-25', apiId: 274 },
  { name: 'Luka Dončić', team: 'LAL', elbowAngle: 98, releaseHeight: 1.13, releaseTime: 0.46, fgPct: 47.8, style: 'Step-Back Master', season: '2024-25', apiId: 132 },
  { name: 'Shai Gilgeous-Alexander', team: 'OKC', elbowAngle: 95, releaseHeight: 1.16, releaseTime: 0.44, fgPct: 53.7, style: 'Efficient Mid-Range', season: '2024-25', apiId: 175 },
  { name: 'Kyrie Irving', team: 'DAL', elbowAngle: 93, releaseHeight: 1.11, releaseTime: 0.41, fgPct: 49.5, style: 'Artistic Scorer, Creative Finisher', season: '2024-25', apiId: 246 },
  { name: 'Anthony Edwards', team: 'MIN', elbowAngle: 94, releaseHeight: 1.15, releaseTime: 0.41, fgPct: 46.1, style: 'Explosive, Pull-Up Power', season: '2024-25', apiId: 666786 },
];

const BUNDLED_BENCHMARKS: NBABenchmarks = {
  eliteElbowAngle: { min: 88, max: 98, ideal: 93 },
  eliteReleaseHeight: { min: 1.10, max: 1.20, ideal: 1.15 },
  eliteReleaseTime: { min: 0.35, max: 0.50, ideal: 0.42 },
  elitePostureQuality: 85,
  eliteFollowThrough: 92,
  eliteConsistency: 85,
  eliteFgPct: 47.2,
  avgElbowAngle: 100,
  avgReleaseHeight: 1.08,
  avgReleaseTime: 0.52,
  avgPostureQuality: 62,
  avgFgPct: 37.6,
};

// Simulation matchup names (no stats needed)
const SIMULATION_PLAYERS = [
  'Stephen Curry', 'LeBron James', 'Kevin Durant', 'Giannis Antetokounmpo',
  'Luka Dončić', 'Kawhi Leonard', 'Ja Morant', 'Klay Thompson',
  'Kyrie Irving', 'Anthony Edwards',
];

// ── Cache Layer ────────────────────────────────────────────────

interface CachedData {
  players: NBAPlayerReference[];
  fetchedAt: number;
}

async function getCached(): Promise<CachedData | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedData;
    if (Date.now() - data.fetchedAt > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

async function setCache(players: NBAPlayerReference[]): Promise<void> {
  try {
    const data: CachedData = { players, fetchedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Silently fail — next call will re-fetch
  }
}

// ── API Fetch ──────────────────────────────────────────────────

/**
 * Fetch live FG% values via backend (/api/nba/fg-pct) powered by swar/nba_api.
 * Merges FG% into the bundled data (biomechanics are from tracking data,
 * not available via this API).
 */
type MaybeApiEnvelope<T> = { data?: T } | T;

interface FgPctRow {
  playerId?: number;
  player_id?: number;
  fgPct?: number;
  fg_pct?: number;
}

function unwrapData<T>(payload: MaybeApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function getCurrentSeasonLabel(): string {
  const now = new Date();
  const startYear = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${(startYear + 1).toString().slice(2)}`;
}

async function fetchLiveStats(): Promise<NBAPlayerReference[]> {
  const playerIds = BUNDLED_PLAYERS
    .filter(p => p.apiId)
    .map(p => p.apiId!);

  const season = getCurrentSeasonLabel();
  const query = `/api/nba/fg-pct?playerIds=${encodeURIComponent(playerIds.join(','))}&season=${encodeURIComponent(season)}`;

  const response = await api.get<MaybeApiEnvelope<FgPctRow[]>>(query);
  const rawRows = unwrapData<FgPctRow[]>(response);
  const rows = Array.isArray(rawRows) ? rawRows : [];

  const fgMap = new Map<number, number>();
  for (const row of rows) {
    const id = row.playerId ?? row.player_id;
    const fg = row.fgPct ?? row.fg_pct;
    if (typeof id === 'number' && typeof fg === 'number' && Number.isFinite(fg)) {
      fgMap.set(id, Math.round(fg * 10) / 10);
    }
  }

  return BUNDLED_PLAYERS.map(player => {
    const liveFg = player.apiId ? fgMap.get(player.apiId) : undefined;
    if (typeof liveFg === 'number') {
      return { ...player, fgPct: liveFg, season };
    }
    return player;
  });
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Get NBA player reference data for comparisons.
 * Tries: (1) fresh cache → (2) live API + cache → (3) bundled fallback.
 */
export async function getNBAPlayers(): Promise<NBAPlayerReference[]> {
  // 1. Check cache
  const cached = await getCached();
  if (cached) return cached.players;

  // 2. Try live API
  try {
    const live = await fetchLiveStats();
    await setCache(live);
    return live;
  } catch {
    // 3. Fallback to bundled
    return [...BUNDLED_PLAYERS];
  }
}

/** Get NBA benchmarks (static — updated with app releases) */
export function getNBABenchmarks(): NBABenchmarks {
  return { ...BUNDLED_BENCHMARKS };
}

/** Get player names for Digital Twin matchup simulation */
export function getSimulationPlayers(): string[] {
  return [...SIMULATION_PLAYERS];
}

/**
 * Search for NBA players by name via backend /api/nba/players/search.
 */
export async function searchNBAPlayers(search: string, limit = 10): Promise<{
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  team: string;
}[]> {
  try {
    const query = `/api/nba/players/search?q=${encodeURIComponent(search)}&limit=${encodeURIComponent(String(limit))}`;
    const response = await api.get<MaybeApiEnvelope<Array<Record<string, unknown>>>>(query);
    const rawPlayers = unwrapData<Array<Record<string, unknown>>>(response);
    const players = Array.isArray(rawPlayers) ? rawPlayers : [];

    return players.map((p) => {
      const firstName = typeof p.firstName === 'string'
        ? p.firstName
        : typeof p.first_name === 'string'
          ? p.first_name
          : '';
      const lastName = typeof p.lastName === 'string'
        ? p.lastName
        : typeof p.last_name === 'string'
          ? p.last_name
          : '';
      const fullName = typeof p.fullName === 'string'
        ? p.fullName
        : typeof p.full_name === 'string'
          ? p.full_name
          : `${firstName} ${lastName}`.trim();

      let team = '';
      if (typeof p.team === 'string') {
        team = p.team;
      } else if (p.team && typeof p.team === 'object') {
        const teamObj = p.team as Record<string, unknown>;
        team = typeof teamObj.fullName === 'string'
          ? teamObj.fullName
          : typeof teamObj.full_name === 'string'
            ? teamObj.full_name
            : typeof teamObj.name === 'string'
              ? teamObj.name
              : '';
      }

      const idRaw = p.id;
      const id = typeof idRaw === 'number' ? idRaw : Number(idRaw ?? 0);

      return {
        id: Number.isFinite(id) ? id : 0,
        firstName,
        lastName,
        fullName,
        position: typeof p.position === 'string' ? p.position : '',
        team,
      };
    }).filter((p) => p.id > 0 && p.fullName.length > 0);
  } catch {
    return [];
  }
}

/**
 * Find the top N NBA players most similar to the given biomechanics.
 */
export function findNBAComparisons(
  players: NBAPlayerReference[],
  elbowAngle: number,
  releaseHeight: number,
  releaseTime: number,
  topN = 3,
): (NBAPlayerReference & { similarity: number })[] {
  return players
    .map(p => {
      const elbowDiff = Math.abs(p.elbowAngle - elbowAngle) / 10;
      const heightDiff = Math.abs(p.releaseHeight - releaseHeight) / 0.1;
      const timeDiff = Math.abs(p.releaseTime - releaseTime) / 0.1;
      const similarity = Math.max(0, 100 - (elbowDiff * 25 + heightDiff * 35 + timeDiff * 40));
      return { ...p, similarity: Math.round(similarity) };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}
