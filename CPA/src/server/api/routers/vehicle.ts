import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";

// Define schema for vehicle output
const VehicleOutputSchema = z.object({
  id: z.string().uuid(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  registration_number: z.string().nullable(),
  // Add more fields as needed
});

// Define schema for vehicle list response
const VehicleListResponseSchema = z.object({
  items: z.array(VehicleOutputSchema),
  pagination: z.object({
    total: z.number(),
    pages: z.number(),
    current: z.number(),
    hasMore: z.boolean()
  })
});

// Define input schema for vehicle list params
const VehicleListParamsSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  clientId: z.string().uuid().optional(),
});

// Define input schema for creating a vehicle
const VehicleCreateInputSchema = z.object({
  make: z.string().min(1, "Vehicle make is required"),
  model: z.string().optional(),
  year: z.number().int().positive()
    .min(1900, "Year must be 1900 or later")
    .max(new Date().getFullYear(), "Year cannot be in the future")
    .optional()
    .transform(val => val === 0 ? undefined : val),
  color: z.string().optional(),
  registration_number: z.string().optional(),
  vin: z.string().optional(),
  engine_number: z.string().optional(),
  // Removed client_id as vehicles are associated with claims, not directly with clients
}).refine(
  (data) => !!data.registration_number || !!data.vin || !!data.engine_number,
  {
    message: "At least one identifier (Registration Number, VIN, or Engine Number) is required",
    path: ["registration_number"], // This will highlight the registration_number field
  }
);

export const vehicleRouter = createTRPCRouter({
  // Get all vehicles
  getAll: publicProcedure
    .output(z.array(VehicleOutputSchema))
    .query(async ({ ctx }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('vehicles')
          .select('id, make, model, registration_number');

        if (error) {
          throw new Error(`Failed to fetch vehicles: ${error.message}`);
        }

        return VehicleOutputSchema.array().parse(data || []);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        throw error;
      }
    }),

  // Get vehicles with pagination and search
  list: publicProcedure
    .input(VehicleListParamsSchema)
    .output(VehicleListResponseSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Calculate pagination parameters
        const page = input.page || 1;
        const limit = input.limit || 10;
        const offset = (page - 1) * limit;

        // Determine sort order
        const sortBy = input.sortBy || 'make';
        const sortOrder = input.sortOrder || 'asc';

        // Start building the query
        let query = ctx.supabase
          .from('vehicles')
          .select('id, make, model, registration_number', { count: 'exact' });

        // Add search condition if provided
        if (input.search) {
          query = query.or(`make.ilike.%${input.search}%,model.ilike.%${input.search}%,registration_number.ilike.%${input.search}%`);
        }

        // Filter by client ID if provided
        if (input.clientId) {
          // Since vehicles don't have a direct client_id field anymore,
          // we need to filter through claims
          // This is a placeholder - you'll need to implement a proper join
          // or use a view that includes this relationship
          console.log('Filtering by client ID is not implemented yet');
          // TODO: Implement proper filtering by client ID through claims
        }

        // Apply sorting and pagination
        const { data, error, count } = await query
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .range(offset, offset + limit - 1);

        if (error) {
          throw new Error(`Failed to fetch vehicles: ${error.message}`);
        }

        // Calculate pagination info
        const total = count || 0;
        const pages = Math.ceil(total / limit);
        const hasMore = page < pages;

        return {
          items: VehicleOutputSchema.array().parse(data || []),
          pagination: {
            total,
            pages,
            current: page,
            hasMore
          }
        };
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        throw error;
      }
    }),

  // Get a single vehicle by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(VehicleOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('vehicles')
          .select('id, make, model, registration_number')
          .eq('id', input.id)
          .single();

        if (error) {
          throw new Error(`Failed to fetch vehicle: ${error.message}`);
        }

        return VehicleOutputSchema.parse(data);
      } catch (error) {
        console.error("Error fetching vehicle:", error);
        throw error;
      }
    }),

  // Create a new vehicle
  create: protectedProcedure
    .input(VehicleCreateInputSchema)
    .output(VehicleOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('vehicles')
          .insert([{
            make: input.make,
            model: input.model,
            year: input.year,
            color: input.color,
            registration_number: input.registration_number,
            vin: input.vin,
            engine_number: input.engine_number,
            // Removed client_id as vehicles are associated with claims, not directly with clients
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select('id, make, model, registration_number')
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create vehicle: ${error.message}`,
            cause: error
          });
        }

        if (!data) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create vehicle: No data returned'
          });
        }

        return VehicleOutputSchema.parse(data);
      } catch (error) {
        console.error("Error creating vehicle:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Unexpected error creating vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error
        });
      }
    }),
});
