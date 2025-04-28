// src/lib/api/domains/vehicles/types.ts
import { z } from "zod";
import { type RouterOutputs, type RouterInputs } from "@/lib/api/types";
import { type PaginatedResponse } from "@/lib/api/types";

// Define Zod schemas for validation
export const VehicleListParamsSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  clientId: z.string().uuid().optional(),
});

// Define schema for creating a vehicle
export const VehicleCreateInputSchema = z.object({
  make: z.string().min(1, "Vehicle make is required"),
  model: z.string().optional(),
  year: z.number().int().positive()
    .min(1900, "Year must be 1900 or later")
    .max(new Date().getFullYear(), "Year cannot be in the future")
    .optional()
    .transform(val => val === 0 ? undefined : val),
  color: z.string().optional(),
  registration_number: z.string().optional(),
  vin: z.string().optional(),
  engine_number: z.string().optional(),
  // Removed client_id as vehicles are associated with claims, not directly with clients
}).refine(
  (data) => !!data.registration_number || !!data.vin || !!data.engine_number,
  {
    message: "At least one identifier (Registration Number, VIN, or Engine Number) is required",
    path: ["registration_number"],
  }
);

// Export types derived from tRPC
export type Vehicle = RouterOutputs["vehicle"]["getById"];
export type VehicleListParams = z.infer<typeof VehicleListParamsSchema>;
export type VehicleListResponse = PaginatedResponse<Vehicle>;
export type VehicleCreateInput = z.infer<typeof VehicleCreateInputSchema>;
