// src/lib/api/domains/appointments/realtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { type Appointment } from './types';
import { toast } from 'sonner';

/**
 * Hook for subscribing to real-time updates for an appointment
 * @param appointmentId The ID of the appointment to subscribe to
 */
export function useAppointmentRealtime(appointmentId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create a Supabase client for this effect
    const supabase = createClient();
    if (!appointmentId) return;

    console.log(`[Realtime] Setting up subscription for appointment ${appointmentId}`);

    // Create a channel for this specific appointment
    const channel = supabase
      .channel(`appointment_${appointmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `id=eq.${appointmentId}`
        },
        (payload) => {
          console.log(`[Realtime] Received update for appointment ${appointmentId}:`, payload);

          // Handle different event types
          if (payload.eventType === 'UPDATE') {
            // Update the appointment in the cache
            queryClient.setQueryData(
              ['appointment', appointmentId],
              payload.new as Appointment
            );

            // Show a toast notification
            toast.info('Appointment updated by another user');
          } else if (payload.eventType === 'DELETE') {
            // Remove the appointment from the cache
            queryClient.removeQueries({
              queryKey: ['appointment', appointmentId]
            });

            // Show a toast notification
            toast.info('Appointment deleted by another user');
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for appointment ${appointmentId}:`, status);
      });

    // Clean up the subscription when the component unmounts
    return () => {
      console.log(`[Realtime] Cleaning up subscription for appointment ${appointmentId}`);
      supabase.removeChannel(channel);
    };
  }, [appointmentId, queryClient]);
}

/**
 * Hook for subscribing to real-time updates for all appointments of a claim
 * @param claimId The ID of the claim to subscribe to
 */
export function useClaimAppointmentsRealtime(claimId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create a Supabase client for this effect
    const supabase = createClient();
    if (!claimId) return;

    console.log(`[Realtime] Setting up subscription for claim appointments ${claimId}`);

    // Create a channel for all appointments of this claim
    const channel = supabase
      .channel(`claim_appointments_${claimId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `claim_id=eq.${claimId}`
        },
        (payload) => {
          console.log(`[Realtime] Received update for claim appointments ${claimId}:`, payload);

          // Invalidate the appointments list for this claim
          queryClient.invalidateQueries({
            queryKey: ['appointment', 'getByClaim', { claim_id: claimId }]
          });

          // Show a toast notification
          if (payload.eventType === 'INSERT') {
            toast.info('New appointment added');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Appointment updated');
          } else if (payload.eventType === 'DELETE') {
            toast.info('Appointment deleted');
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for claim appointments ${claimId}:`, status);
      });

    // Clean up the subscription when the component unmounts
    return () => {
      console.log(`[Realtime] Cleaning up subscription for claim appointments ${claimId}`);
      supabase.removeChannel(channel);
    };
  }, [claimId, queryClient]);
}
