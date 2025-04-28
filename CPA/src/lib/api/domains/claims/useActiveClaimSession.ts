'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CACHE_TIMES, QUERY_KEYS } from './constants';
import { createEntityQueryKey } from '@/lib/api/utils';
import { apiClient } from '@/lib/api/client';

/**
 * Hook for tracking active claim sessions and extending cache times
 * This ensures that claim data remains in cache for the duration of a session
 *
 * @param claimId The ID of the claim being viewed/edited
 */
export function useActiveClaimSession(claimId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!claimId) return;

    console.log(`[Session] Starting active session for claim ${claimId}`);

    // Set extended cache times for this specific claim
    const detailsQueryKey = createEntityQueryKey('claim', 'getDetails', claimId);
    const summaryQueryKey = createEntityQueryKey('claim', 'getSummary', claimId);

    // Extend cache times for details
    queryClient.setQueryDefaults(detailsQueryKey, {
      staleTime: CACHE_TIMES.ACTIVE_SESSION.STALE_TIME,
      gcTime: CACHE_TIMES.ACTIVE_SESSION.GC_TIME,
    });

    // Extend cache times for summary
    queryClient.setQueryDefaults(summaryQueryKey, {
      staleTime: CACHE_TIMES.ACTIVE_SESSION.STALE_TIME,
      gcTime: CACHE_TIMES.ACTIVE_SESSION.GC_TIME,
    });

    // Track session activity
    const lastActivity = Date.now();
    const activityKey = `claim-session-${claimId}`;
    sessionStorage.setItem(activityKey, lastActivity.toString());

    // Set up activity tracking
    const updateActivity = () => {
      sessionStorage.setItem(activityKey, Date.now().toString());
    };

    // Update activity on user interactions
    window.addEventListener('click', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('scroll', updateActivity);

    // Clean up when component unmounts
    return () => {
      console.log(`[Session] Ending active session for claim ${claimId}`);

      // Remove event listeners
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('scroll', updateActivity);

      // Reset to default cache times
      queryClient.setQueryDefaults(detailsQueryKey, {
        staleTime: CACHE_TIMES.STALE_TIME.DETAILS,
        gcTime: CACHE_TIMES.GC_TIME.DETAILS,
      });

      queryClient.setQueryDefaults(summaryQueryKey, {
        staleTime: CACHE_TIMES.STALE_TIME.SUMMARY,
        gcTime: CACHE_TIMES.GC_TIME.SUMMARY,
      });

      // We don't remove the session tracking data here to allow for session resumption
      // It will be cleaned up by the browser when the session ends
    };
  }, [claimId, queryClient]);

  /**
   * Manually extend the session
   * Call this function when the user explicitly wants to extend their session
   */
  const extendSession = () => {
    if (!claimId) return;

    console.log(`[Session] Manually extending session for claim ${claimId}`);

    // Update last activity time
    const activityKey = `claim-session-${claimId}`;
    sessionStorage.setItem(activityKey, Date.now().toString());
  };

  /**
   * Get the remaining session time in milliseconds
   * Returns -1 if no session is active
   */
  const getRemainingSessionTime = (): number => {
    if (!claimId) return -1;

    const activityKey = `claim-session-${claimId}`;
    const lastActivityStr = sessionStorage.getItem(activityKey);

    if (!lastActivityStr) return -1;

    const lastActivity = parseInt(lastActivityStr, 10);
    const sessionDuration = CACHE_TIMES.ACTIVE_SESSION.STALE_TIME;
    const expiryTime = lastActivity + sessionDuration;

    return Math.max(0, expiryTime - Date.now());
  };

  return {
    extendSession,
    getRemainingSessionTime,
  };
}
