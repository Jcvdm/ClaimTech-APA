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
    // Secure development override with additional safeguards
    if (process.env.NODE_ENV === 'development' && 
        process.env.ALLOW_DEV_BYPASS === 'true' && 
        process.env.DEV_USER_ID &&
        !user) {
      
      // Log security warning with request details
      console.warn(`[SECURITY] DEV BYPASS ACTIVE: ${new Date().toISOString()} - Request from: ${opts.request?.headers.get('x-forwarded-for') || 'unknown'}`);

      // Create a mock user using environment variables
      user = {
        id: process.env.DEV_USER_ID,
        app_metadata: { provider: 'email' },
        user_metadata: { name: 'Development User' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: process.env.DEV_USER_EMAIL || 'dev-user@example.com',
        role: 'authenticated'
      };

      // Only log non-sensitive information
      console.log("[tRPC Context] Development user session created");
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

    // In development, only use mock user if explicitly allowed
    if (process.env.NODE_ENV === 'development' && 
        process.env.ALLOW_DEV_BYPASS === 'true' && 
        process.env.DEV_USER_ID) {
      user = {
        id: process.env.DEV_USER_ID,
        app_metadata: { provider: 'email' },
        user_metadata: { name: 'Development User' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: process.env.DEV_USER_EMAIL || 'dev-user@example.com',
        role: 'authenticated'
      };

      console.log("[tRPC Context] Created fallback development user after error");
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
  if (!ctx.user) {
    console.warn(`[tRPC Auth] Unauthorized access attempt to: ${path}`);
    throw new Error("UNAUTHORIZED: User must be logged in to access this resource");
  }

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[tRPC Auth] User authenticated for procedure: ${path}`);
  }

  return next({
    ctx: {
      // Infers the `user` as non-nullable
      user: ctx.user,
    },
  });
});

/**
 * Simple rate limiting middleware
 */
const createRateLimit = (max: number, windowMs: number) => {
  const store = new Map<string, { count: number; resetTime: number }>();
  
  return t.middleware(async ({ ctx, path, next }) => {
    if (!ctx.user?.id) {
      return next();
    }

    const key = `${ctx.user.id}:${path}`;
    const now = Date.now();
    const resetTime = now + windowMs;
    
    const existing = store.get(key);
    
    if (!existing || now > existing.resetTime) {
      store.set(key, { count: 1, resetTime });
    } else {
      existing.count++;
      if (existing.count > max) {
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((existing.resetTime - now) / 1000)} seconds.`);
      }
    }

    return next();
  });
};

const bulkOperationRateLimit = createRateLimit(5, 60 * 1000); // 5 per minute
const standardRateLimit = createRateLimit(30, 60 * 1000); // 30 per minute  
const readOnlyRateLimit = createRateLimit(100, 60 * 1000); // 100 per minute

export const protectedProcedure = t.procedure.use(timingMiddleware).use(enforceUserIsAuthed);
export const rateLimitedProcedure = protectedProcedure.use(standardRateLimit);
export const bulkRateLimitedProcedure = protectedProcedure.use(bulkOperationRateLimit);
export const readOnlyRateLimitedProcedure = protectedProcedure.use(readOnlyRateLimit);
