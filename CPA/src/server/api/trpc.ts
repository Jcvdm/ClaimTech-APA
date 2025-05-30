/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { createClient, createClientForRouteHandler } from "@/utils/supabase/server.server";
import { type NextRequest } from "next/server";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers, request?: NextRequest }) => {
  let supabase;
  let user = null;

  try {
    // Use the appropriate client based on the context
    if (opts.request) {
      // For Route Handlers (API routes)
      supabase = createClientForRouteHandler(opts.request);
    } else {
      // For Server Components
      supabase = createClient();
    }

    // Get the user from Supabase auth (will be null if not authenticated)
    try {
      const authResponse = await supabase.auth.getUser();
      user = authResponse.data?.user || null;
    } catch (authError) {
      console.error('[tRPC Context] Error getting user from Supabase auth:', authError);
      // Continue with user as null
    }

    // ---- DEVELOPMENT OVERRIDE START ----
    // WARNING: Remove or disable this override before production!
    if (process.env.NODE_ENV === 'development' && !user) {
      console.warn("\n⚠️ WARNING: Using mock user for tRPC context in development. Real authentication is bypassed. ⚠️\n");

      // Create a mock user
      user = {
        id: 'fb0c14a7-550a-4d41-90f4-86d714961f87', // Your provided User ID
        app_metadata: { provider: 'email' },
        user_metadata: { name: 'Development User' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'dev-user@example.com',
        role: 'authenticated'
      };

      console.log("[tRPC Context] Created mock user for development:", {
        userId: user.id,
        email: user.email,
        name: user.user_metadata.name
      });

      // For development, let's modify the RLS policy to allow all operations
      // This is a workaround for local development only
      try {
        // Add a policy that allows all operations for all users
        await supabase.rpc('create_dev_policy_for_vehicles');
        console.log('Created development policy for vehicles table');

        // Also create a policy for appointments table
        await supabase.rpc('create_dev_policy_for_appointments');
        console.log('Created development policy for appointments table');

        // Create policy for vehicle inspections table
        try {
          await supabase.rpc('create_dev_policy_for_vehicle_inspections');
          console.log('Created development policy for vehicle inspections table');
        } catch (inspectionPolicyError) {
          console.warn('Failed to create vehicle inspections policy (may not exist yet):', inspectionPolicyError);
        }

        // Create policy for estimates table
        try {
          await supabase.rpc('create_dev_policy_for_estimates');
          console.log('Created development policy for estimates table');
        } catch (estimatesPolicyError) {
          console.warn('Failed to create estimates policy (may not exist yet):', estimatesPolicyError);
        }

        // Create policy for estimate_lines table
        try {
          await supabase.rpc('create_dev_policy_for_estimate_lines');
          console.log('Created development policy for estimate_lines table');
        } catch (estimateLinesPolicyError) {
          console.warn('Failed to create estimate_lines policy (may not exist yet):', estimateLinesPolicyError);
        }
      } catch (policyError) {
        console.warn('Failed to create development policy:', policyError);
        // Continue without policies - they might already exist
      }
    }
    // ---- DEVELOPMENT OVERRIDE END ----
  } catch (error) {
    console.error('[tRPC Context] Error creating Supabase client:', error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`[tRPC Context] Error message: ${error.message}`);
      console.error(`[tRPC Context] Error stack: ${error.stack}`);
    }

    // Create a minimal mock Supabase client that won't cause further errors
    supabase = {
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
    };

    // In development, still use the mock user
    if (process.env.NODE_ENV === 'development') {
      user = {
        id: 'fb0c14a7-550a-4d41-90f4-86d714961f87',
        app_metadata: { provider: 'email' },
        user_metadata: { name: 'Development User' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'dev-user@example.com',
        role: 'authenticated'
      };

      console.log("[tRPC Context] Created fallback mock user after error:", {
        userId: user.id,
        email: user.email,
        name: user.user_metadata.name
      });
    }
  }

  return {
    ...opts,
    supabase,
    user, // This will be the real user or the mock user in dev
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
	const start = Date.now();

	if (t._config.isDev) {
		// artificial delay in dev
		const waitMs = Math.floor(Math.random() * 400) + 100;
		await new Promise((resolve) => setTimeout(resolve, waitMs));
	}

	const result = await next();

	const end = Date.now();
	console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

	return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API that require
 * authentication. It guarantees that a user querying is authorized and provides their user data
 * in the context.
 *
 * @see https://trpc.io/docs/server/middlewares
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next, path }) => {
  console.log(`[tRPC Auth] Checking auth for procedure: ${path}`);

  if (!ctx.user) {
    console.error(`[tRPC Auth] No user found in context for procedure: ${path}`);
    throw new Error("UNAUTHORIZED: User must be logged in to access this resource");
  }

  console.log(`[tRPC Auth] User authenticated for procedure: ${path}`, {
    userId: ctx.user.id,
    email: ctx.user.email
  });

  return next({
    ctx: {
      // Infers the `user` as non-nullable
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(timingMiddleware).use(enforceUserIsAuthed);
