// src/lib/api/domains/posts/types.ts
import { z } from "zod";
import { type RouterOutputs, type RouterInputs } from "@/lib/api/types";

// Define Zod schemas for validation if needed
export const PostCreateSchema = z.object({
  name: z.string().min(1, "Post name is required")
});

// Export types derived from tRPC
export type Post = RouterOutputs["post"]["getLatest"];
export type PostCreateInput = RouterInputs["post"]["create"];
