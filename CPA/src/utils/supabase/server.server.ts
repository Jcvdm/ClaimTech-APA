import "server-only";
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/env'
import { type NextRequest } from 'next/server'

// For Server Components
export function createClient() {
  try {
    // Create a server client that reads/writes cookies
    return createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          async get(name: string) {
            try {
              const cookieStore = await cookies()
              const cookie = cookieStore.get(name)
              return cookie?.value
            } catch (error) {
              console.error(`[Supabase Client] Error getting cookie ${name}:`, error)
              return undefined
            }
          },
          async set(name: string, value: string, options: CookieOptions) {
            try {
              const cookieStore = await cookies()
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
              console.debug(`[Supabase Client] Ignoring cookie set error for ${name} in middleware`)
            }
          },
          async remove(name: string, options: CookieOptions) {
            try {
              const cookieStore = await cookies()
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
              console.debug(`[Supabase Client] Ignoring cookie remove error for ${name} in middleware`)
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('[Supabase Client] Error creating client for Server Component:', error)

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`[Supabase Client] Error message: ${error.message}`)
      console.error(`[Supabase Client] Error stack: ${error.stack}`)
    }

    // Rethrow the error to be handled by the caller
    throw error
  }
}

// For Route Handlers
export const createClientForRouteHandler = (request: NextRequest) => {
  try {
    return createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            try {
              return request.cookies.getAll().map(cookie => ({
                name: cookie.name,
                value: cookie.value,
              }))
            } catch (error) {
              console.error('[Supabase Client] Error getting all cookies:', error)
              return [] // Return empty array as fallback
            }
          },
          setAll() {
            // Route handlers don't need to set cookies on the response
            // as we're only using this for reading in the API context
          },
        },
      }
    )
  } catch (error) {
    console.error('[Supabase Client] Error creating client for Route Handler:', error)

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`[Supabase Client] Error message: ${error.message}`)
      console.error(`[Supabase Client] Error stack: ${error.stack}`)
    }

    // Rethrow the error to be handled by the caller
    throw error
  }
}
