// src/lib/api/domains/logs/constants.ts

// Define query keys for logs
export const QUERY_KEYS = {
  // Base key for all log queries
  all: ["logs"] as const,

  // Keys for logs by claim
  byClaim: (claimId: string, limit: number = 10, offset: number = 0) => 
    ["log", "getByClaim", { claim_id: claimId, limit, offset }] as const,

  // tRPC-compatible query keys
  TRPC: {
    GET_BY_CLAIM: (input: { claim_id: string, limit?: number, offset?: number }) => [
      ["trpc", "log", "getByClaim"],
      { input, type: "query" }
    ],
  }
};

// Define cache times for logs
export const LOG_CACHE_TIMES = {
  STALE_TIME: 1000 * 60 * 5, // 5 minutes
  GC_TIME: 1000 * 60 * 30, // 30 minutes
};
