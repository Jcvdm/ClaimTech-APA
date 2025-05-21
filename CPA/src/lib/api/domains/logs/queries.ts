import { apiClient } from "@/lib/api/client";
import { ClaimLog, ClaimLogsQueryInput } from "./types";
import { QueryOptions } from "@/lib/api/types";
import { QUERY_KEYS, LOG_CACHE_TIMES } from "./constants";

/**
 * Fetch logs for a claim
 */
export const getClaimLogs = (
  input: ClaimLogsQueryInput,
  options?: QueryOptions<ClaimLog[]>
) => {
  return apiClient.query<ClaimLog[]>(
    () => apiClient.raw.log.getByClaim.useQuery(input),
    {
      staleTime: LOG_CACHE_TIMES.STALE_TIME,
      gcTime: LOG_CACHE_TIMES.GC_TIME,
      ...options,
    }
  );
};
