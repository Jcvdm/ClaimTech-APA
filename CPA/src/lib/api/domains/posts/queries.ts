// src/lib/api/domains/posts/queries.ts
import { apiClient } from "../../client";
import { type QueryOptions } from "../../client";
import { type Post } from "./types";

export const postQueries = {
  /**
   * Get the latest post
   */
  getLatest: (options?: QueryOptions<Post>) => 
    apiClient.query<Post>(
      () => apiClient.raw.post.getLatest.useQuery(), 
      options
    ),
  
  /**
   * Get hello greeting
   */
  hello: (text: string, options?: QueryOptions<{ greeting: string }>) => 
    apiClient.query<{ greeting: string }>(
      () => apiClient.raw.post.hello.useQuery({ text }), 
      options
    )
};
