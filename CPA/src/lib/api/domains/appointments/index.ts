// src/lib/api/domains/appointments/index.ts
import { type RouterOutputs, type RouterInputs } from "@/lib/api/types";
import { useQueryState } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { CACHE_TIMES } from "@/lib/api/domains/claims/constants";

// Define types
export type Appointment = RouterOutputs["appointment"]["getByClaim"][number];
export type AppointmentCreateInput = RouterInputs["appointment"]["create"];

// Define hooks
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

// Define mutations
export function useCreateAppointment() {
  return apiClient.raw.appointment.create.useMutation();
}
