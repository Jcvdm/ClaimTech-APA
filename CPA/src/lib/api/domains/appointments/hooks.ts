// src/lib/api/domains/appointments/hooks.ts
import { useQueryClient } from "@tanstack/react-query";
import { appointmentMutations } from "./mutations";
import {
  type Appointment,
  type AppointmentUpdateInput,
  type AppointmentStatusUpdateInput
} from "./types";
import { useQueryState } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";
import { CACHE_TIMES } from "@/lib/api/domains/claims/constants";

/**
 * Hook for fetching appointments by claim ID
 */
export function useAppointmentsByClaim(claimId: string | null | undefined) {
  // Check if data is already in the cache
  const queryClient = useQueryClient();
  const queryKey = ['appointment', 'getByClaim', { claim_id: claimId }];
  const cachedData = queryClient.getQueryData<Appointment[]>(queryKey);

  // If we have cached data and a valid claimId, we can use the cached data
  // and avoid unnecessary refetches
  const shouldFetch = !!claimId && !cachedData;

  // Log cache status for debugging
  if (claimId && cachedData) {
    console.log(`[Cache] Using cached appointments data for claim ${claimId}`);
  }

  return useQueryState(() =>
    apiClient.query<Appointment[]>(
      () => apiClient.raw.appointment.getByClaim.useQuery({ claim_id: claimId || '' }),
      {
        // Only fetch if we don't have cached data
        enabled: shouldFetch,
        staleTime: CACHE_TIMES.ACTIVE_SESSION.STALE_TIME, // 60 minutes - use active session time
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchInterval: undefined // Don't automatically refetch
      }
    )
  );
}

/**
 * Hook for creating a new appointment
 */
export function useCreateAppointment() {
  return apiClient.raw.appointment.create.useMutation();
}

/**
 * Hook for updating an appointment with optimistic updates
 */
export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return appointmentMutations.update({
    onMutate: async (updatedAppointment) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['appointment', updatedAppointment.id]
      });

      // Snapshot the previous value
      const previousAppointment = queryClient.getQueryData<Appointment>(
        ['appointment', updatedAppointment.id]
      );

      // Optimistically update to the new value
      queryClient.setQueryData(
        ['appointment', updatedAppointment.id],
        {
          ...previousAppointment,
          ...updatedAppointment
        }
      );

      // Return a context object with the snapshotted value
      return { previousAppointment };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousAppointment) {
        queryClient.setQueryData(
          ['appointment', variables.id],
          context.previousAppointment
        );
      }
    },
    onSettled: (data) => {
      // Always refetch after error or success to make sure our local data is correct
      if (data) {
        queryClient.invalidateQueries({
          queryKey: ['appointment', data.id]
        });
      }
    }
  });
}

/**
 * Hook for updating just the status of an appointment with optimistic updates
 */
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return appointmentMutations.updateStatus({
    onMutate: async (statusUpdate) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['appointment', statusUpdate.id]
      });

      // Snapshot the previous value
      const previousAppointment = queryClient.getQueryData<Appointment>(
        ['appointment', statusUpdate.id]
      );

      // Get the current appointment data from the cache
      const currentAppointment = previousAppointment ||
        queryClient.getQueryData<Appointment[]>(
          ['appointment', 'getByClaim', { claim_id: statusUpdate.claim_id }]
        )?.find(a => a.id === statusUpdate.id);

      if (currentAppointment) {
        // Optimistically update to the new value
        queryClient.setQueryData(
          ['appointment', statusUpdate.id],
          {
            ...currentAppointment,
            appointment_status: statusUpdate.appointment_status
          }
        );

        // Also update the appointment in the list if it exists
        const appointmentsList = queryClient.getQueryData<Appointment[]>(
          ['appointment', 'getByClaim', { claim_id: statusUpdate.claim_id }]
        );

        if (appointmentsList) {
          queryClient.setQueryData(
            ['appointment', 'getByClaim', { claim_id: statusUpdate.claim_id }],
            appointmentsList.map(appointment =>
              appointment.id === statusUpdate.id
                ? { ...appointment, appointment_status: statusUpdate.appointment_status }
                : appointment
            )
          );
        }
      }

      // Return a context object with the snapshotted value
      return { previousAppointment };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousAppointment) {
        queryClient.setQueryData(
          ['appointment', variables.id],
          context.previousAppointment
        );
      }
    },
    onSettled: (data) => {
      // Always refetch after error or success to make sure our local data is correct
      if (data) {
        queryClient.invalidateQueries({
          queryKey: ['appointment', data.id]
        });

        // Also invalidate the claim details to update any appointment-related data there
        queryClient.invalidateQueries({
          queryKey: ['claim.getDetails']
        });
      }
    }
  });
}
