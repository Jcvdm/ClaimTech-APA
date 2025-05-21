// src/lib/api/domains/claims/mutations.ts
import { apiClient } from "../../client";
import { type MutationOptions } from "../../client";
import { toast } from "sonner";
import {
  type ClaimWithRelations,
  type ClaimCreateInput,
  type ClaimUpdateInput,
  type ClaimStatus,
  type ClaimCreateInputWithOptionalFields, // Import the new type
  type ClaimWithVehicleInput
} from "./types";
import { type RouterInputs } from "@/trpc/shared";

export const claimMutations = {
  /**
   * Create a new claim with vehicle in a single transaction
   */
  createClaimWithVehicle: (
    options?: MutationOptions<ClaimWithRelations, ClaimWithVehicleInput>
  ) =>
    apiClient.mutation<ClaimWithRelations, ClaimWithVehicleInput>(
      () => apiClient.raw.claim.createClaimWithVehicle.useMutation(),
      {
        onSuccess: async (data, variables) => {
          toast.success("Claim created successfully");

          // Log the claim creation
          try {
            const { logClaimCreated } = await import("@/lib/api/domains/logs/mutations");
            await logClaimCreated(data.id, data).mutateAsync({} as any);
          } catch (error) {
            console.error("Failed to log claim creation:", error);
          }

          options?.onSuccess?.(data, variables);
        },
        ...options
      }
    ),

  /**
   * Create a new claim
   */
  create: (
    options?: MutationOptions<ClaimWithRelations, ClaimCreateInputWithOptionalFields> // Use the new type
  ) =>
    apiClient.mutation<ClaimWithRelations, ClaimCreateInputWithOptionalFields>( // Use the new type
      () => apiClient.raw.claim.create.useMutation(),
      {
        onSuccess: async (data, variables) => {
          toast.success("Claim created successfully");

          // Log the claim creation
          try {
            const { logClaimCreated } = await import("@/lib/api/domains/logs/mutations");
            await logClaimCreated(data.id, data).mutateAsync({} as any);
          } catch (error) {
            console.error("Failed to log claim creation:", error);
          }

          options?.onSuccess?.(data, variables);
        },
        ...options
      }
    ),

  /**
   * Update an existing claim
   */
  update: (
    options?: MutationOptions<ClaimWithRelations, ClaimUpdateInput>
  ) =>
    apiClient.mutation<ClaimWithRelations, ClaimUpdateInput>(
      () => apiClient.raw.claim.update.useMutation(),
      {
        onSuccess: (data, variables) => {
          toast.success("Claim updated successfully");
          options?.onSuccess?.(data, variables);
        },
        ...options
      }
    ),

  /**
   * Update claim status
   */
  updateStatus: (
    options?: MutationOptions<ClaimWithRelations, { id: string, status: ClaimStatus }>
  ) =>
    apiClient.mutation<ClaimWithRelations, { id: string, status: ClaimStatus }>(
      () => apiClient.raw.claim.updateStatus.useMutation(),
      {
        onMutate: async (variables) => {
          // Store the old status for logging
          const queryKey = ["claim", "getById", { id: variables.id }];
          const previousClaim = apiClient.getQueryData<ClaimWithRelations>(queryKey);
          return { previousClaim };
        },
        onSuccess: async (data, variables, context) => {
          toast.success(`Claim status updated to ${data.status}`);

          // Log the status change
          try {
            const oldStatus = context?.previousClaim?.status || "Unknown";
            const { logClaimStatusChanged } = await import("@/lib/api/domains/logs/mutations");
            await logClaimStatusChanged(data.id, oldStatus, data.status).mutateAsync({} as any);
          } catch (error) {
            console.error("Failed to log claim status change:", error);
          }

          options?.onSuccess?.(data, variables);
        },
        ...options
      }
    ),

  /**
   * Delete a claim
   */
  delete: (
    options?: MutationOptions<void, { id: string }>
  ) =>
    apiClient.mutation<void, { id: string }>(
      () => apiClient.raw.claim.delete.useMutation(),
      {
        onSuccess: (data, variables) => {
          toast.success("Claim deleted successfully");
          options?.onSuccess?.(data, variables);
        },
        ...options
      }
    ),

  /**
   * Record inspection for a claim
   */
  recordInspection: (
    options?: MutationOptions<ClaimWithRelations, { id: string, inspection_datetime: Date }>
  ) =>
    apiClient.mutation<ClaimWithRelations, { id: string, inspection_datetime: Date }>(
      () => apiClient.raw.claim.recordInspection.useMutation(),
      {
        onSuccess: (data, variables) => {
          toast.success("Inspection recorded successfully");
          options?.onSuccess?.(data, variables);
        },
        ...options
      }
    )
};
