// src/lib/api/domains/estimates/hooks.ts
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { estimateQueries } from "./queries";
import { estimateMutations } from "./mutations";
import { QUERY_KEYS } from "./constants";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import {
  type Estimate,
  type EstimateCreate,
  type EstimateLine,
  type EstimateLineCreate,
  type EstimateLineUpdate
} from "./types";

/**
 * Hook for fetching an estimate by claim ID
 * @param claimId The claim ID
 * @param options Additional query options
 */
export function useEstimate(claimId: string, options?: any) {
  return estimateQueries.getByClaimId(claimId, options);
}

/**
 * Hook for fetching estimate lines by estimate ID
 * @param estimateId The estimate ID
 * @param options Additional query options
 */
export function useEstimateLines(estimateId: string, options?: any) {
  console.log("[useEstimateLines] Fetching lines for estimate:", estimateId);

  const query = estimateQueries.getLinesByEstimateId(estimateId, {
    ...options,
    onSuccess: (data) => {
      console.log("[useEstimateLines] Successfully fetched lines:", data);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error("[useEstimateLines] Error fetching lines:", error);
      options?.onError?.(error);
    },
    // Force refetch on mount to ensure we have the latest data
    refetchOnMount: true,
    // Reduce stale time to ensure we get fresh data
    staleTime: 0
  });

  return query;
}

/**
 * Hook for creating a new estimate
 */
export function useCreateEstimate() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore(); // Get user from Zustand store

  console.log("[useCreateEstimate] Current user from Zustand store:", user);

  // Check if user is available
  if (!user) {
    console.warn("[useCreateEstimate] No user found in Zustand store. Using default mock user.");
  }

  return estimateMutations.create({
    onSuccess: (data) => {
      console.log("[useCreateEstimate] Estimate created successfully:", data);
      // Invalidate the claim's estimate query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BY_CLAIM_ID(data.claim_id)
      });
    },
    onError: (error) => {
      console.error("[useCreateEstimate] Error creating estimate:", error);
    }
  });
}

/**
 * Hook for adding a new estimate line with optimistic updates
 */
export function useAddEstimateLine() {
  const queryClient = useQueryClient();
  const [loadingLines, setLoadingLines] = useState<Record<string, boolean>>({});

  const mutation = estimateMutations.createLine({
    onMutate: async (newLine) => {
      // Set loading state for this operation
      setLoadingLines(prev => ({ ...prev, new: true }));

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(newLine.estimate_id)
      });

      // Snapshot the previous value
      const previousLines = queryClient.getQueryData<EstimateLine[]>(
        QUERY_KEYS.LINES_BY_ESTIMATE_ID(newLine.estimate_id)
      ) || [];

      // Optimistically update to the new value
      const optimisticLine: EstimateLine = {
        id: `temp-${Date.now()}`, // Temporary ID
        ...newLine,
        damage_id: newLine.damage_id || null,
        part_number: newLine.part_number || null,
        part_cost: newLine.part_cost || null,
        strip_fit_hours: newLine.strip_fit_hours || null,
        repair_hours: newLine.repair_hours || null,
        paint_hours: newLine.paint_hours || null,
        sublet_cost: newLine.sublet_cost || null,
        line_notes: null,
        calculated_part_total: null,
        calculated_labor_total: null,
        calculated_paint_material_total: null,
        calculated_sublet_total: null,
        calculated_line_total: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      queryClient.setQueryData<EstimateLine[]>(
        QUERY_KEYS.LINES_BY_ESTIMATE_ID(newLine.estimate_id),
        [...previousLines, optimisticLine]
      );

      // Return a context object with the snapshot
      return { previousLines, newLine };
    },
    onSuccess: (data, variables) => {
      // Clear loading state
      setLoadingLines(prev => {
        const updated = { ...prev };
        delete updated.new;
        return updated;
      });

      // Invalidate the estimate lines query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(data.estimate_id)
      });

      // Invalidate the estimate query to update totals
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BY_ID(data.estimate_id)
      });

      toast.success("Estimate line added successfully");
    },
    onError: (error, variables, context) => {
      // Clear loading state
      setLoadingLines(prev => {
        const updated = { ...prev };
        delete updated.new;
        return updated;
      });

      // Revert back to the previous state
      if (context) {
        queryClient.setQueryData(
          QUERY_KEYS.LINES_BY_ESTIMATE_ID(context.newLine.estimate_id),
          context.previousLines
        );
      }

      toast.error(`Failed to add estimate line: ${error.message}`);
    }
  });

  return {
    ...mutation,
    loadingLines,
    isLineLoading: (lineId: string) => loadingLines[lineId] || false,
    isNewLineLoading: () => loadingLines.new || false
  };
}

/**
 * Hook for updating an estimate line with optimistic updates
 */
export function useUpdateEstimateLine() {
  const queryClient = useQueryClient();
  const [loadingLines, setLoadingLines] = useState<Record<string, boolean>>({});

  const mutation = estimateMutations.updateLine({
    onMutate: async (updatedLine) => {
      // Set loading state for this line
      setLoadingLines(prev => ({ ...prev, [updatedLine.id]: true }));

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(updatedLine.estimate_id)
      });

      // Snapshot the previous value
      const previousLines = queryClient.getQueryData<EstimateLine[]>(
        QUERY_KEYS.LINES_BY_ESTIMATE_ID(updatedLine.estimate_id)
      ) || [];

      // Optimistically update to the new value
      const optimisticLines = previousLines.map(line =>
        line.id === updatedLine.id
          ? { ...line, ...updatedLine, updated_at: new Date() }
          : line
      );

      queryClient.setQueryData<EstimateLine[]>(
        QUERY_KEYS.LINES_BY_ESTIMATE_ID(updatedLine.estimate_id),
        optimisticLines
      );

      // Return a context object with the snapshot
      return { previousLines, updatedLine };
    },
    onSuccess: (data, variables) => {
      // Clear loading state for this line
      setLoadingLines(prev => {
        const updated = { ...prev };
        delete updated[variables.id];
        return updated;
      });

      // Invalidate the estimate lines query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(data.estimate_id)
      });

      // Invalidate the estimate query to update totals
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BY_ID(data.estimate_id)
      });

      toast.success("Estimate line updated successfully");
    },
    onError: (error, variables, context) => {
      // Clear loading state for this line
      setLoadingLines(prev => {
        const updated = { ...prev };
        delete updated[variables.id];
        return updated;
      });

      // Revert back to the previous state
      if (context) {
        queryClient.setQueryData(
          QUERY_KEYS.LINES_BY_ESTIMATE_ID(context.updatedLine.estimate_id),
          context.previousLines
        );
      }

      toast.error(`Failed to update estimate line: ${error.message}`);
    }
  });

  return {
    ...mutation,
    loadingLines,
    isLineLoading: (lineId: string) => loadingLines[lineId] || false
  };
}

/**
 * Hook for deleting an estimate line with optimistic updates
 */
export function useDeleteEstimateLine() {
  const queryClient = useQueryClient();
  const [loadingLines, setLoadingLines] = useState<Record<string, boolean>>({});

  const mutation = estimateMutations.deleteLine({
    onMutate: async (variables) => {
      // Set loading state for this line
      setLoadingLines(prev => ({ ...prev, [variables.id]: true }));

      // We need to find the estimate_id for this line
      // Search through all estimate line queries
      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({ type: 'active' });

      let estimateId: string | null = null;
      let previousLines: EstimateLine[] = [];

      for (const query of queries) {
        const queryKey = query.queryKey;
        if (Array.isArray(queryKey) && queryKey[0] === QUERY_KEYS.BASE && queryKey[1] === 'lines') {
          const lines = queryClient.getQueryData<EstimateLine[]>(queryKey) || [];
          const lineToDelete = lines.find(line => line.id === variables.id);

          if (lineToDelete) {
            estimateId = lineToDelete.estimate_id;
            previousLines = lines;
            break;
          }
        }
      }

      if (!estimateId) {
        return { previousLines: [], estimateId: null };
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(estimateId)
      });

      // Optimistically update to the new value
      const optimisticLines = previousLines.filter(line => line.id !== variables.id);

      queryClient.setQueryData<EstimateLine[]>(
        QUERY_KEYS.LINES_BY_ESTIMATE_ID(estimateId),
        optimisticLines
      );

      // Return a context object with the snapshot
      return { previousLines, estimateId };
    },
    onSuccess: (_, variables, context) => {
      // Clear loading state for this line
      setLoadingLines(prev => {
        const updated = { ...prev };
        delete updated[variables.id];
        return updated;
      });

      if (context?.estimateId) {
        // Invalidate the estimate lines query
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.LINES_BY_ESTIMATE_ID(context.estimateId)
        });

        // Invalidate the estimate query to update totals
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.BY_ID(context.estimateId)
        });
      } else {
        // If we couldn't determine the estimate_id, invalidate all estimate-related queries
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ALL
        });
      }

      toast.success("Estimate line deleted successfully");
    },
    onError: (error, variables, context) => {
      // Clear loading state for this line
      setLoadingLines(prev => {
        const updated = { ...prev };
        delete updated[variables.id];
        return updated;
      });

      // Revert back to the previous state
      if (context && context.estimateId) {
        queryClient.setQueryData(
          QUERY_KEYS.LINES_BY_ESTIMATE_ID(context.estimateId),
          context.previousLines
        );
      }

      toast.error(`Failed to delete estimate line: ${error.message}`);
    }
  });

  return {
    ...mutation,
    loadingLines,
    isLineLoading: (lineId: string) => loadingLines[lineId] || false
  };
}
