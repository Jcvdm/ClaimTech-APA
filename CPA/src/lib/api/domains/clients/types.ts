// src/lib/api/domains/clients/types.ts
import { z } from "zod";
import { type RouterOutputs, type RouterInputs } from "@/lib/api/types";
import { type PaginatedResponse } from "@/lib/api/types";

// Define Zod schemas for validation
export const ClientListParamsSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Export types derived from tRPC
export type Client = RouterOutputs["client"]["getById"];
export type ClientListParams = z.infer<typeof ClientListParamsSchema>;
export type ClientListResponse = PaginatedResponse<Client>;
