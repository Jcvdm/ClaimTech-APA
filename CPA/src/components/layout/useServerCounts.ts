'use client';

import { useState, useEffect } from 'react';
import { type ClaimCountsResponse } from '@/lib/api/domains/claims/types';

/**
 * Hook to read claim counts from the server-rendered script tag
 */
export function useServerCounts(): ClaimCountsResponse {
  const [counts, setCounts] = useState<ClaimCountsResponse>({
    active: 0,
    additionals: 0,
    frc: 0,
    finalized: 0,
    history: 0
  });

  useEffect(() => {
    // Read the counts from the script tag injected by the server component
    const scriptTag = document.getElementById('claim-counts-data');
    if (scriptTag) {
      try {
        const data = JSON.parse(scriptTag.textContent || '{}') as ClaimCountsResponse;
        setCounts(data);
      } catch (error) {
        console.error('Error parsing claim counts data:', error);
      }
    }
  }, []);

  return counts;
}
