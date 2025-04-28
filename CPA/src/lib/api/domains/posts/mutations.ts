// src/lib/api/domains/posts/mutations.ts
import { apiClient } from "../../client";
import { type MutationOptions } from "../../client";
import { toast } from "sonner";
import { type Post, type PostCreateInput } from "./types";

export const postMutations = {
  /**
   * Create a new post
   */
  create: (
    options?: MutationOptions<Post, PostCreateInput>
  ) => 
    apiClient.mutation<Post, PostCreateInput>(
      () => apiClient.raw.post.create.useMutation(),
      {
        onSuccess: (data, variables) => {
          toast.success("Post created successfully");
          options?.onSuccess?.(data, variables);
        },
        ...options
      }
    )
};
