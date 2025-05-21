// src/lib/api/queryClient.server.ts
import "server-only";
import { cache } from "react";
import { QueryClient } from "@tanstack/react-query";

// Create a new QueryClient instance for server-side rendering
// This is cached using React's cache() to deduplicate requests
export const getQueryClient = cache(() => new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry on the server
      retry: false,
      // Don't refetch on window focus on the server
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect on the server
      refetchOnReconnect: false,
      // Don't refetch on mount on the server
      refetchOnMount: false,
    },
  },
}));
