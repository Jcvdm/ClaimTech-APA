// src/lib/api/domains/vehicles/mutations.ts
import { apiClient } from "../../client";
import { type MutationOptions } from "../../client";
import { type Vehicle, type VehicleCreateInput } from "./types";

export const vehicleMutations = {
  /**
   * Create a new vehicle
   */
  create: (input: VehicleCreateInput, options?: MutationOptions<Vehicle>) => 
    apiClient.mutation<Vehicle, VehicleCreateInput>(
      () => apiClient.raw.vehicle.create.useMutation(),
      input,
      options
    ),
};
