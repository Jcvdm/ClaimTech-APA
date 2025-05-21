// src/lib/api/domains/inspections/constants.ts
import { CACHE_TIMES as API_CACHE_TIMES } from "@/lib/api/constants";
import { CACHE_TIMES as CLAIM_CACHE_TIMES } from "@/lib/api/domains/claims/constants";

// Define query keys for inspections
export const QUERY_KEYS = {
  // Base key for all inspection queries
  all: ["inspections"] as const,

  // Keys for lists of inspections
  lists: () => [...QUERY_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...QUERY_KEYS.lists(), filters] as const,

  // Keys for individual inspection details
  details: () => [...QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,

  // Keys for inspections by claim
  byClaim: (claimId: string) => [...QUERY_KEYS.all, "byClaim", claimId] as const,

  // tRPC-compatible query keys
  TRPC: {
    CREATE: (input: any) => [
      ["trpc", "inspection", "create"],
      { input, type: "mutation" }
    ],
    GET_BY_CLAIM: (claimId: string) => [
      ["trpc", "inspection", "getByClaim"],
      { input: { claim_id: claimId }, type: "query" }
    ],
    GET_BY_ID: (id: string) => [
      ["trpc", "inspection", "getById"],
      { input: { id }, type: "query" }
    ],
  }
};

// Define cache times for inspections
export const INSPECTION_CACHE_TIMES = {
  // Use the existing cache times from the claims domain
  STALE_TIME: CLAIM_CACHE_TIMES.ACTIVE_SESSION.STALE_TIME, // 60 minutes
  GC_TIME: CLAIM_CACHE_TIMES.ACTIVE_SESSION.GC_TIME, // 120 minutes
};
