// src/lib/api/domains/vehicles/constants.ts
import { CACHE_TIMES } from "@/lib/api/constants";

// Define cache times for vehicles
export const VEHICLE_CACHE_TIMES = {
  // Use the existing cache times from the API constants
  STALE_TIME: CACHE_TIMES.MEDIUM, // 5 minutes
  GC_TIME: CACHE_TIMES.LONG, // 30 minutes
};

// Define query keys for vehicles
export const QUERY_KEYS = {
  // Base key for all vehicle queries
  all: ["vehicles"] as const,
  
  // Keys for lists of vehicles
  lists: () => [...QUERY_KEYS.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...QUERY_KEYS.lists(), filters] as const,
  
  // Keys for individual vehicle details
  details: () => [...QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
  
  // tRPC-compatible query keys
  TRPC: {
    all: ["vehicle"] as const,
    GET_ALL: () => [
      ["trpc", "vehicle", "getAll"],
      { type: "query" }
    ],
    GET_BY_ID: (id: string) => [
      ["trpc", "vehicle", "getById"],
      { input: { id }, type: "query" }
    ],
    LIST: (params: Record<string, unknown>) => [
      ["trpc", "vehicle", "list"],
      { input: params, type: "query" }
    ],
  }
};
