import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

export interface PreCogClip {
  id: string;
  category: string;
  difficulty: number;
  correct_answer: string;
  url: string;
  duration_ms: number;
}

export interface PreCogProgression {
  currentSpeedMph: number;
  baselineSpeedMph: number;
  history: Array<{
    date: string;
    accuracy: number;
  }>;
  milestone: string;
}

export function usePreCog() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clips, setClips] = useState<{ calibration: PreCogClip[]; training: PreCogClip[] } | null>(null);
  const [progression, setProgression] = useState<PreCogProgression | null>(null);

  const fetchClips = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ speedMph: number; calibration: PreCogClip[]; training: PreCogClip[] }>('/api/precog/clips');
      setClips({
        calibration: data.calibration,
        training: data.training,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clips');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProgression = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');
      
      const data = await api.get<PreCogProgression>(`/api/precog/progression/${user.id}`);
      setProgression(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progression');
    } finally {
      setLoading(false);
    }
  }, []);

  const finishSession = useCallback(async (results: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      return await api.post('/api/precog/session', {
        ...results,
        userId: user.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish session');
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    clips,
    progression,
    fetchClips,
    fetchProgression,
    finishSession,
  };
}
