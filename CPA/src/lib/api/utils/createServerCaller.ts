/**
 * Standardized utility for creating a server-side tRPC caller
 * This provides a consistent way to make server-side tRPC calls
 * across all domain-specific server-prefetch files.
 */
import "server-only";
import { NextRequest } from "next/server";
import { cache } from "react";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter, createCaller } from "@/server/api/root";
import { type AppRouter } from "@/server/api/root";

/**
 * Creates a server-side tRPC caller with proper request context
 * This is cached using React's cache() to deduplicate requests
 *
 * @returns A tRPC caller that can be used to make server-side requests
 */
export const createServerCaller = cache(async () => {
  try {
    // Create a mock request object with headers
    const mockRequest = new NextRequest('http://localhost:3000', {
      headers: {
        'x-trpc-source': 'server',
        'content-type': 'application/json',
      },
    });

    // Create a proper context with the mock request
    // Wrap in try/catch to handle potential Supabase client creation errors
    let ctx;
    try {
      ctx = await createTRPCContext({
        headers: mockRequest.headers,
        request: mockRequest,
      });
    } catch (contextError) {
      console.error('[Server Caller] Error creating tRPC context:', contextError);

      // Create a minimal context that won't cause further errors
      ctx = {
        headers: mockRequest.headers,
        request: mockRequest,
        // Provide a minimal mock Supabase client with required methods
        supabase: {
          auth: {
            getUser: async () => ({ data: { user: null }, error: null }),
          },
          from: () => ({
            select: () => ({
              count: () => ({
                in: () => ({ data: [], error: null }),
                eq: () => ({ data: [], error: null }),
              }),
              in: () => ({ data: [], error: null }),
              eq: () => ({ data: [], error: null }),
            }),
          }),
          rpc: () => ({ data: null, error: null }),
        },
        // Mock user for development
        user: process.env.NODE_ENV === 'development' ? {
          id: 'fb0c14a7-550a-4d41-90f4-86d714961f87',
          app_metadata: { provider: 'email' },
          user_metadata: { name: 'Development User' },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          email: 'dev-user@example.com',
          role: 'authenticated'
        } : null,
      };
    }

    // Use the createCaller from root.ts with our context
    return createCaller(ctx);
  } catch (error) {
    console.error('[Server Caller] Error creating server caller:', error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`[Server Caller] Error message: ${error.message}`);
      console.error(`[Server Caller] Error stack: ${error.stack}`);
    }

    // Instead of throwing, return a proxy object that returns empty data for all calls
    // This prevents the entire page from failing if tRPC setup fails
    return new Proxy({} as ReturnType<typeof createCaller>, {
      get: (target, prop) => {
        // First level - router (e.g., claim, client)
        return new Proxy({}, {
          get: (target, innerProp) => {
            // Second level - procedure (e.g., getAll, getById)
            console.warn(`[Server Caller] Returning empty data for ${String(prop)}.${String(innerProp)} due to server caller error`);

            // Return a function that returns empty data based on the procedure name
            return async (params?: any) => {
              // Handle specific procedures with known return types
              if (String(prop) === 'claim') {
                if (String(innerProp) === 'getCounts') {
                  return {
                    active: 0,
                    additionals: 0,
                    frc: 0,
                    finalized: 0,
                    history: 0
                  };
                } else if (String(innerProp) === 'list') {
                  return {
                    items: [],
                    pagination: {
                      total: 0,
                      pages: 0,
                      current: params?.page || 1,
                      hasMore: false
                    }
                  };
                } else if (String(innerProp) === 'getAll') {
                  return [];
                } else if (String(innerProp) === 'getSummary' || String(innerProp) === 'getDetails') {
                  return null;
                }
              } else if (String(prop) === 'appointment') {
                if (String(innerProp) === 'getByClaim') {
                  return [];
                }
              } else if (String(prop) === 'attachment') {
                if (String(innerProp) === 'getByClaim') {
                  return [];
                }
              } else if (String(prop) === 'lookup') {
                if (String(innerProp) === 'getProvinces' || String(innerProp) === 'getLossAdjusters') {
                  return [];
                }
              }

              // Default fallback for unknown procedures
              return null;
            };
          }
        });
      }
    });
  }
});

/**
 * Type-safe wrapper for specific procedures
 * This allows for better type inference when calling specific procedures
 *
 * @example
 * const caller = await getTypedServerCaller();
 * const claims = await caller.claim.getAll();
 */
export const getTypedServerCaller = async () => {
  return await createServerCaller() as ReturnType<typeof appRouter.createCaller>;
};

/**
 * Creates a query key in the format expected by tRPC
 * This ensures cache hits when using the same data on client and server
 *
 * @param router The router name (e.g., 'claim', 'client')
 * @param procedure The procedure name (e.g., 'getAll', 'getById')
 * @param input The input parameters for the procedure
 * @returns A query key array in the format expected by tRPC
 */
export function createTRPCQueryKey<
  TRouter extends keyof AppRouter,
  TProcedure extends keyof AppRouter[TRouter]
>(
  router: TRouter & string,
  procedure: TProcedure & string,
  input?: Record<string, any>
): unknown[] {
  return [['trpc', router, procedure], { input, type: 'query' }];
}
