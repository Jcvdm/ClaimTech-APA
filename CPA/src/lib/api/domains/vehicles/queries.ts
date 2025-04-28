// src/lib/api/domains/vehicles/queries.ts
import { apiClient } from "../../client";
import { type QueryOptions } from "../../client";
import { type Vehicle, type VehicleListParams, type VehicleListResponse } from "./types";

export const vehicleQueries = {
  /**
   * Get all vehicles (basic query)
   */
  getAll: (options?: QueryOptions<Vehicle[]>) => 
    apiClient.query<Vehicle[]>(
      () => apiClient.raw.vehicle.getAll.useQuery(), 
      options
    ),
  
  /**
   * Get vehicles with filtering, pagination, and sorting
   */
  list: (params: VehicleListParams, options?: QueryOptions<VehicleListResponse>) => 
    apiClient.query<VehicleListResponse>(
      () => apiClient.raw.vehicle.list.useQuery(params), 
      options
    ),
  
  /**
   * Get a single vehicle by ID
   */
  getById: (id: string, options?: QueryOptions<Vehicle>) => 
    apiClient.query<Vehicle>(
      () => apiClient.raw.vehicle.getById.useQuery({ id }), 
      {
        enabled: !!id,
        ...options
      }
    ),
};
