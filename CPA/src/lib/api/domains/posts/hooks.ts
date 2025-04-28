// src/lib/api/domains/posts/hooks.ts
import { useQueryClient } from "@tanstack/react-query";
import { postQueries } from "./queries";
import { postMutations } from "./mutations";
import { type Post, type PostCreateInput } from "./types";
import { createEntityQueryKey } from "@/lib/api/utils";
import { useQueryState } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

/**
 * Hook for fetching the latest post
 */
export function useLatestPost() {
  const query = postQueries.getLatest();
  return useQueryState(() => query);
}

/**
 * Hook for creating a post with cache invalidation
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return postMutations.create({
    onSuccess: () => {
      // Invalidate relevant queries after successful creation
      queryClient.invalidateQueries({
        queryKey: createEntityQueryKey('post', 'getLatest', '')
      });
    }
  });
}

/**
 * Hook for getting a hello greeting
 */
export function useHelloGreeting(text: string) {
  const query = postQueries.hello(text);
  return useQueryState(() => query);
}
