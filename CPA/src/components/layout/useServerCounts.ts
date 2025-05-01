'use client';

import { useState, useEffect } from 'react';
import { type ClaimCountsResponse } from '@/lib/api/domains/claims/types';

// Default counts to use as fallback
const DEFAULT_COUNTS: ClaimCountsResponse = {
  active: 0,
  additionals: 0,
  frc: 0,
  finalized: 0,
  history: 0
};

/**
 * Hook to read claim counts from the server-rendered script tag
 * with improved error handling and fallback
 */
export function useServerCounts(): ClaimCountsResponse {
  const [counts, setCounts] = useState<ClaimCountsResponse>(DEFAULT_COUNTS);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      // Read the counts from the script tag injected by the server component
      const scriptTag = document.getElementById('claim-counts-data');

      if (!scriptTag || !scriptTag.textContent) {
        console.warn('Claim counts data not found in DOM, using default counts');
        return; // Keep using default counts
      }

      // Parse the JSON data
      const parsedData = JSON.parse(scriptTag.textContent) as Partial<ClaimCountsResponse>;

      // Validate the data structure and use defaults for missing properties
      const validatedData: ClaimCountsResponse = {
        active: typeof parsedData.active === 'number' ? parsedData.active : DEFAULT_COUNTS.active,
        additionals: typeof parsedData.additionals === 'number' ? parsedData.additionals : DEFAULT_COUNTS.additionals,
        frc: typeof parsedData.frc === 'number' ? parsedData.frc : DEFAULT_COUNTS.frc,
        finalized: typeof parsedData.finalized === 'number' ? parsedData.finalized : DEFAULT_COUNTS.finalized,
        history: typeof parsedData.history === 'number' ? parsedData.history : DEFAULT_COUNTS.history
      };

      setCounts(validatedData);
    } catch (err) {
      console.error('Error parsing claim counts data:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      // Keep using default counts on error
    }
  }, []);

  // Log error for debugging but don't throw - keep the UI working
  if (error) {
    console.error('[useServerCounts] Error:', error);
  }

  return counts;
}
