// src/lib/api/domains/inspections/mutations.ts
import { apiClient } from "@/lib/api/client";
import { type MutationOptions } from "@/lib/api/client";
import { type Inspection, type InspectionCreateInput, type InspectionRecordInput } from "./types";

/**
 * Mutations for the inspections domain
 */
export const inspectionMutations = {
  /**
   * Create a new inspection
   * @param options Mutation options
   * @returns Mutation object
   */
  createInspection: (
    options?: MutationOptions<Inspection, InspectionCreateInput>
  ) =>
    apiClient.mutation<Inspection, InspectionCreateInput>(
      () => apiClient.raw.inspection.create.useMutation(),
      {
        onSuccess: (data, variables) => {
          console.log("Inspection created successfully:", data);
          options?.onSuccess?.(data, variables);
        },
        onError: (error, variables) => {
          console.error("Error creating inspection:", error);
          options?.onError?.(error, variables);
        },
        ...options,
      }
    ),
    
  /**
   * Record an inspection (simplified version that just updates the claim)
   * @param options Mutation options
   * @returns Mutation object
   */
  recordInspection: (
    options?: MutationOptions<any, InspectionRecordInput>
  ) =>
    apiClient.mutation<any, InspectionRecordInput>(
      () => apiClient.raw.claim.recordInspection.useMutation(),
      {
        onSuccess: (data, variables) => {
          console.log("Inspection recorded successfully:", data);
          options?.onSuccess?.(data, variables);
        },
        onError: (error, variables) => {
          console.error("Error recording inspection:", error);
          options?.onError?.(error, variables);
        },
        ...options,
      }
    ),
};
