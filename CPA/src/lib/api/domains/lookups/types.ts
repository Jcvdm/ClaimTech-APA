// src/lib/api/domains/lookups/types.ts
import { type RouterOutputs } from "@/lib/api/types";

// Export types derived from tRPC
export type Province = RouterOutputs["lookup"]["getProvinces"][number];
export type LossAdjuster = RouterOutputs["lookup"]["getLossAdjusters"][number];
export type Client = RouterOutputs["client"]["getAll"][number];
