'use client';
/**
 * usePermissions — client-side role-based permission hook.
 *
 * Reads the current user's role from the SupabaseAuthProvider and
 * exposes helpers for checking permissions in UI components.
 *
 * Roles (from Player.role):
 *   - 'user'  — default authenticated player *   -'admin' — full platform access
 *   - 'coach' — elevated access for coaching features
 */

import { useMemo } from 'react';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export type PlayerRole = 'user' | 'admin' | 'coach' | string;

interface PermissionsState {
  role: PlayerRole | null;
  isAdmin: boolean;
  isCoach: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  /** Check if the current user has at least the given role level */
  hasRole: (role: PlayerRole) => boolean;
  /** Check if the current user is the owner of a resource */
  isOwner: (ownerId: string) => boolean;
  /** Check if the current user can access admin features */
  canAccessAdmin: boolean;
}

const ROLE_HIERARCHY: Record<string, number> = {
  user: 1,
  coach: 2,
  admin: 3,
};

export function usePermissions(): PermissionsState {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setRole(null);
      setLoading(false);
      return;
    }

    // Fetch the player's role from the database
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase
      .from('Player')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setRole(data.role as PlayerRole);
        } else {
          setRole('user'); // default role
        }
        setLoading(false);
      });
  }, [isAuthenticated, user]);

  return useMemo(() => {
    const isAdmin = role === 'admin';
    const isCoach = role === 'coach' || isAdmin;

    const hasRole = (requiredRole: PlayerRole): boolean => {
      if (!role) return false;
      const currentLevel = ROLE_HIERARCHY[role] ?? 1;
      const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 1;
      return currentLevel >= requiredLevel;
    };

    const isOwner = (ownerId: string): boolean => {
      if (!user) return false;
      return user.id === ownerId;
    };

    return {
      role,
      isAdmin,
      isCoach,
      isAuthenticated,
      loading: authLoading || loading,
      hasRole,
      isOwner,
      canAccessAdmin: isAdmin,
    };
  }, [role, isAuthenticated, authLoading, loading, user]);
}
