import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";

// Define schema for client output
const ClientOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  // Add more fields as needed
});

// Define schema for client list response
const ClientListResponseSchema = z.object({
  items: z.array(ClientOutputSchema),
  pagination: z.object({
    total: z.number(),
    pages: z.number(),
    current: z.number(),
    hasMore: z.boolean()
  })
});

// Define input schema for client list params
const ClientListParamsSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const clientRouter = createTRPCRouter({
  // Get all clients
  getAll: publicProcedure
    .input(z.object({}).optional())
    .output(z.array(ClientOutputSchema))
    .query(async ({ ctx }) => {
      console.log("[clientRouter] Executing getAll procedure...");
      try {
        const { data, error } = await ctx.supabase
          .from('clients')
          .select('id, name');

        if (error) {
          console.error("[clientRouter] Error fetching clients:", error);
          return []; // Return empty array instead of throwing
        }

        console.log(`[clientRouter] Successfully fetched ${data?.length || 0} clients`);
        return ClientOutputSchema.array().parse(data || []);
      } catch (error) {
        console.error("[clientRouter] Error fetching clients:", error);
        return []; // Return empty array instead of throwing
      }
    }),

  // Get clients with pagination and search
  list: publicProcedure
    .input(ClientListParamsSchema)
    .output(ClientListResponseSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Calculate pagination parameters
        const page = input.page || 1;
        const limit = input.limit || 10;
        const offset = (page - 1) * limit;

        // Determine sort order
        const sortBy = input.sortBy || 'name';
        const sortOrder = input.sortOrder || 'asc';

        // Start building the query
        let query = ctx.supabase
          .from('clients')
          .select('id, name', { count: 'exact' });

        // Add search condition if provided
        if (input.search) {
          query = query.ilike('name', `%${input.search}%`);
        }

        // Apply sorting and pagination
        const { data, error, count } = await query
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .range(offset, offset + limit - 1);

        if (error) {
          throw new Error(`Failed to fetch clients: ${error.message}`);
        }

        // Calculate pagination info
        const total = count || 0;
        const pages = Math.ceil(total / limit);
        const hasMore = page < pages;

        return {
          items: ClientOutputSchema.array().parse(data || []),
          pagination: {
            total,
            pages,
            current: page,
            hasMore
          }
        };
      } catch (error) {
        console.error("Error fetching clients:", error);
        throw error;
      }
    }),

  // Get a single client by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(ClientOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('clients')
          .select('id, name')
          .eq('id', input.id)
          .single();

        if (error) {
          throw new Error(`Failed to fetch client: ${error.message}`);
        }

        return ClientOutputSchema.parse(data);
      } catch (error) {
        console.error("Error fetching client:", error);
        throw error;
      }
    }),
});
