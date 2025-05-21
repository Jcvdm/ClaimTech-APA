// src/lib/api/domains/claims/realtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { getQueryKey } from '@/lib/api/utils';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

/**
 * Hook for subscribing to real-time updates for claim counts
 * This will update the claim counts in the cache when claims are created, updated, or deleted
 */
export function useClaimCountsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create a Supabase client for this effect
    const supabase = createClient();

    console.log(`[Realtime] Setting up subscription for claim counts`);

    // Create a channel for all claims
    const channel = supabase
      .channel(`claim_counts`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'claims',
        },
        (payload) => {
          console.log(`[Realtime] Received update for claims:`, payload);

          // Invalidate the claim counts query to trigger a refetch
          queryClient.invalidateQueries({
            queryKey: getQueryKey(apiClient.raw.claim.getCounts)
          });

          // Show a toast notification based on the event type
          if (payload.eventType === 'INSERT') {
            toast.info('New claim created');
          } else if (payload.eventType === 'UPDATE') {
            // Only show a toast for status updates
            if (payload.old && payload.new && payload.old.status !== payload.new.status) {
              toast.info(`Claim status updated to ${payload.new.status}`);
            }
          } else if (payload.eventType === 'DELETE') {
            toast.info('Claim deleted');
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for claim counts:`, status);
      });

    // Clean up the subscription when the component unmounts
    return () => {
      console.log(`[Realtime] Cleaning up subscription for claim counts`);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
