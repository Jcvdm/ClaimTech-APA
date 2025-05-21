// src/server/api/serverTrpc.ts
import "server-only";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { appRouter } from "./root";
import { createTRPCContext } from "./trpc";
import superjson from "superjson";

// Create a server-side TRPC helper
// This is used for server-side rendering and prefetching
export const serverTrpc = createServerSideHelpers({
  router: appRouter,
  ctx: await createTRPCContext({
    headers: new Headers(),
  }),
  transformer: superjson,
});
