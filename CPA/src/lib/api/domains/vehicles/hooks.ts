// src/lib/api/domains/vehicles/hooks.ts
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { vehicleQueries } from "./queries";
import { vehicleMutations } from "./mutations";
import { type VehicleListParams, type VehicleCreateInput } from "./types";
import { useQueryState } from "@/lib/api/hooks";
import { getQueryKey } from "@/lib/api/utils";
import { apiClient } from "@/lib/api/client";

/**
 * Hook for fetching all vehicles
 */
export function useVehicles() {
  const query = vehicleQueries.getAll();
  return useQueryState(() => query);
}

/**
 * Hook for fetching vehicles with filtering
 */
export function useVehiclesList(params: VehicleListParams) {
  const query = vehicleQueries.list(params);
  return useQueryState(() => query);
}

/**
 * Hook for fetching a single vehicle by ID
 */
export function useVehicle(id: string) {
  const query = vehicleQueries.getById(id);
  return useQueryState(() => query);
}

/**
 * Hook for fetching vehicles by client ID
 */
export function useVehiclesByClient(clientId: string | undefined | null) {
  // Only include clientId in params if it's a valid non-empty string
  const params: VehicleListParams = {
    ...(clientId ? { clientId } : {}),
    limit: 100, // Fetch more vehicles to ensure we get all for a client
  };

  // Determine if the query should be enabled
  const isEnabled = !!clientId && typeof clientId === 'string' && clientId.length > 0;

  const query = vehicleQueries.list(params, {
    enabled: isEnabled // Only run the query if we have a valid clientId
  });

  return useQueryState(() => query);
}

/**
 * Hook for creating a new vehicle with cache invalidation
 */
export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const mutation = apiClient.raw.vehicle.create.useMutation();

  return {
    ...mutation,
    mutateAsync: async (input: VehicleCreateInput) => {
      try {
        const result = await mutation.mutateAsync(input);
        // Invalidate relevant queries after successful creation
        queryClient.invalidateQueries({ queryKey: getQueryKey(apiClient.raw.vehicle.list) });
        toast.success("Vehicle created successfully");
        return result;
      } catch (error: any) {
        toast.error(`Error creating vehicle: ${error.message}`);
        throw error;
      }
    }
  };
}
