// src/lib/api/domains/inspections/mutations.ts
import { apiClient } from "@/lib/api/client";
import { type MutationOptions } from "@/lib/api/client";
import {
  type Inspection,
  type InspectionCreateInput,
  type InspectionRecordInput,
  type InspectionUpdateInput
} from "./types";

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
        onSuccess: async (data, variables) => {
          console.log("Inspection created successfully:", data);

          // Log the inspection started
          try {
            const { logInspectionStarted } = await import("@/lib/api/domains/logs/mutations");
            await logInspectionStarted(data.claim_id, data).mutateAsync({} as any);
          } catch (error) {
            console.error("Failed to log inspection started:", error);
          }

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
        onSuccess: async (data, variables) => {
          console.log("Inspection recorded successfully:", data);

          // Log the inspection started
          try {
            const { logInspectionStarted } = await import("@/lib/api/domains/logs/mutations");
            await logInspectionStarted(variables.id || variables.claim_id, data).mutateAsync({} as any);
          } catch (error) {
            console.error("Failed to log inspection started:", error);
          }

          options?.onSuccess?.(data, variables);
        },
        onError: (error, variables) => {
          console.error("Error recording inspection:", error);
          options?.onError?.(error, variables);
        },
        ...options,
      }
    ),

  /**
   * Update an existing inspection
   * @param options Mutation options
   * @returns Mutation object
   */
  updateInspection: (
    options?: MutationOptions<Inspection, InspectionUpdateInput>
  ) =>
    apiClient.mutation<Inspection, InspectionUpdateInput>(
      () => apiClient.raw.inspection.update.useMutation(),
      {
        onSuccess: async (data, variables) => {
          console.log("Inspection updated successfully:", data);

          // Log the inspection completed if the inspection is being marked as completed
          if (variables.is_completed) {
            try {
              const { logInspectionCompleted } = await import("@/lib/api/domains/logs/mutations");
              await logInspectionCompleted(data.claim_id, data).mutateAsync({} as any);
            } catch (error) {
              console.error("Failed to log inspection completed:", error);
            }
          }

          options?.onSuccess?.(data, variables);
        },
        onError: (error, variables) => {
          console.error("Error updating inspection:", error);
          options?.onError?.(error, variables);
        },
        ...options,
      }
    ),
};
