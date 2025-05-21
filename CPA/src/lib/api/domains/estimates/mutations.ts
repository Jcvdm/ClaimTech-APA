// src/lib/api/domains/estimates/mutations.ts
import { apiClient } from "@/lib/api/client";
import { type MutationOptions } from "@/lib/api/client";
import { toast } from "sonner";
import {
  type Estimate,
  type EstimateCreate,
  type EstimateLine,
  type EstimateLineCreate,
  type EstimateLineUpdate
} from "./types";

export const estimateMutations = {
  /**
   * Create a new estimate
   * @param options Mutation options
   */
  create: (options?: MutationOptions<Estimate, EstimateCreate>) =>
    apiClient.mutation<Estimate, EstimateCreate>(
      () => apiClient.raw.estimate.create.useMutation(),
      {
        onSuccess: (data) => {
          console.log("[estimateMutations] Estimate created successfully:", data);
          toast.success("Estimate created successfully");
          options?.onSuccess?.(data, options.variables as EstimateCreate);
        },
        onError: (error) => {
          console.error("[estimateMutations] Failed to create estimate:", error);
          toast.error(`Failed to create estimate: ${error.message}`);
          options?.onError?.(error);
        },
        ...options
      }
    ),

  /**
   * Create a new estimate line
   * @param options Mutation options
   */
  createLine: (options?: MutationOptions<EstimateLine, EstimateLineCreate>) =>
    apiClient.mutation<EstimateLine, EstimateLineCreate>(
      () => apiClient.raw.estimate.createLine.useMutation(),
      {
        onSuccess: (data) => {
          toast.success("Estimate line added successfully");
          options?.onSuccess?.(data, options.variables as EstimateLineCreate);
        },
        onError: (error) => {
          toast.error(`Failed to add estimate line: ${error.message}`);
          options?.onError?.(error);
        },
        ...options
      }
    ),

  /**
   * Update an estimate line
   * @param options Mutation options
   */
  updateLine: (options?: MutationOptions<EstimateLine, EstimateLineUpdate>) =>
    apiClient.mutation<EstimateLine, EstimateLineUpdate>(
      () => apiClient.raw.estimate.updateLine.useMutation(),
      {
        onSuccess: (data) => {
          toast.success("Estimate line updated successfully");
          options?.onSuccess?.(data, options.variables as EstimateLineUpdate);
        },
        onError: (error) => {
          toast.error(`Failed to update estimate line: ${error.message}`);
          options?.onError?.(error);
        },
        ...options
      }
    ),

  /**
   * Delete an estimate line
   * @param options Mutation options
   */
  deleteLine: (options?: MutationOptions<void, { id: string }>) =>
    apiClient.mutation<void, { id: string }>(
      () => apiClient.raw.estimate.deleteLine.useMutation(),
      {
        onSuccess: (data, variables) => {
          toast.success("Estimate line deleted successfully");
          options?.onSuccess?.(data, variables);
        },
        onError: (error) => {
          toast.error(`Failed to delete estimate line: ${error.message}`);
          options?.onError?.(error);
        },
        ...options
      }
    ),
};
