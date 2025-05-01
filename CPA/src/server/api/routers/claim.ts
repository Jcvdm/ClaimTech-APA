import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { ClaimStatus, ClaimInstruction } from "@/lib/api/domains/claims/types";
import { TRPCError } from "@trpc/server";

// Define type of loss enum
const TypeOfLossEnum = z.enum([
  'Accident',
  'Theft',
  'Fire',
  'Flood',
  'Hail',
  'Vandalism',
  'Other'
]);

// Define a schema for claims with related data from joins
const ClaimWithRelationsOutputSchema = z.object({
  id: z.string().uuid(),
  job_number: z.string().nullable(),
  client_reference: z.string().nullable(),
  status: z.string(),
  instruction: z.nativeEnum(ClaimInstruction).nullable(),
  date_of_loss: z.coerce.date().nullable(),
  time_of_loss: z.string().nullable(),
  type_of_loss: TypeOfLossEnum.nullable(),
  accident_description: z.string().nullable(),
  claims_handler_name: z.string().nullable(),
  claims_handler_contact: z.string().nullable(),
  claims_handler_email: z.string().nullable(),
  province_id: z.string().uuid().nullable(),
  created_at: z.coerce.date().nullable(),
  created_by_employee_id: z.string().uuid().nullable(),
  updated_by_employee_id: z.string().uuid().nullable(),
  inspection_datetime: z.coerce.date().nullable(), // Added inspection_datetime field
  client: z.object({
    name: z.string()
  }).nullable(),
  vehicle: z.object({
    make: z.string().nullable(),
    model: z.string().nullable(),
    registration_number: z.string().nullable()
  }).nullable(),
});

// Define schema for claim summary
const ClaimSummaryOutputSchema = z.object({
  id: z.string().uuid(),
  job_number: z.string().nullable(),
  client_name: z.string(),
  vehicle_details: z.string(),
  status: z.nativeEnum(ClaimStatus),
  date_of_loss: z.string(),
  type_of_loss: z.string().nullable(),
  claims_handler_name: z.string().nullable(),
  claims_handler_contact: z.string().nullable(),
  claims_handler_email: z.string().nullable(),
  vehicle_make: z.string().nullable(),
  vehicle_model: z.string().nullable(),
  vehicle_registration: z.string().nullable(),
});

// Define schema for loss adjuster
const LossAdjusterSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.string().nullable()
}).nullable();

// Define schema for appointment
const AppointmentSchema = z.object({
  id: z.string().uuid(),
  appointment_datetime: z.string().nullable(),
  appointment_status: z.string().nullable(),
  appointment_duration_minutes: z.number().nullable(),
  location_type: z.string().nullable(),
  location_address: z.string().nullable(),
  appointment_contact_name: z.string().nullable(),
  appointment_contact_phone: z.string().nullable(),
  special_instructions: z.string().nullable()
});

// Define schema for claim details
const ClaimDetailsOutputSchema = ClaimSummaryOutputSchema.extend({
  client_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  client_reference: z.string().nullable(),
  instruction: z.nativeEnum(ClaimInstruction).nullable(),
  time_of_loss: z.string().nullable(),
  accident_description: z.string().nullable(),
  province_id: z.string().uuid().nullable(),
  created_at: z.coerce.date().nullable(),
  instructed_date: z.coerce.date().nullable(), // Alias for created_at
  created_by_employee_id: z.string().uuid().nullable(),
  updated_by_employee_id: z.string().uuid().nullable(),
  assigned_to_employee_id: z.string().uuid().nullable(),
  loss_adjuster: LossAdjusterSchema,
  insured_name: z.string().nullable(),
  insured_contact: z.string().nullable(),
  inspection_datetime: z.coerce.date().nullable(), // Added inspection_datetime field
  appointments: z.array(AppointmentSchema).optional().default([]),
  latest_appointment: AppointmentSchema.nullable().optional()
});

// Define schema for claim counts
const ClaimCountsOutputSchema = z.object({
  active: z.number(),
  additionals: z.number(),
  frc: z.number(),
  finalized: z.number(),
  history: z.number()
});

// Define schema for claim list params
const ClaimListParamsSchema = z.object({
  filter: z.enum(['active', 'additionals', 'frc', 'finalized', 'history']).default('active'),
  page: z.number().default(1),
  limit: z.number().default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Define schema for claim list response
const ClaimListResponseSchema = z.object({
  items: z.array(ClaimWithRelationsOutputSchema),
  pagination: z.object({
    total: z.number(),
    pages: z.number(),
    current: z.number(),
    hasMore: z.boolean()
  })
});

// Define input schema for creating a claim
const ClaimCreateInputSchema = z.object({
  client_id: z.string().uuid(),
  vehicle_id: z.string().uuid(), // Vehicle ID is required
  client_reference: z.string().optional().nullable(),
  instruction: z.nativeEnum(ClaimInstruction),
  date_of_loss: z.date({ required_error: "Date of Loss is required." }), // Maps to timestamptz
  time_of_loss: z.string().optional().nullable(), // Time in HH:MM format
  type_of_loss: TypeOfLossEnum.optional().nullable(),
  accident_description: z.string().optional().nullable(),
  claims_handler_name: z.string().optional().nullable(),
  claims_handler_contact: z.string().optional().nullable(),
  claims_handler_email: z.string().email("Invalid email").optional().nullable(),
  province_id: z.string().uuid().optional().nullable(),
  assigned_to_employee_id: z.string().uuid().optional().nullable(),
  // Note: job_number is now auto-generated by a database trigger
});

// Define input schema for updating a claim
const ClaimUpdateInputSchema = z.object({
  id: z.string().uuid(),
  job_number: z.string().optional().nullable(),
  client_reference: z.string().optional().nullable(),
  instruction: z.nativeEnum(ClaimInstruction).optional(),
});

// Define input schema for updating status
const ClaimUpdateStatusInputSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(ClaimStatus),
});

// Define input schema for recording inspection
// Note: This is kept for backward compatibility but new code should use the schema in the inspections domain
const ClaimRecordInspectionInputSchema = z.object({
  // Accept either id or claim_id for backward compatibility
  id: z.string().uuid().optional(),
  claim_id: z.string().uuid().optional(),
  inspection_datetime: z.date(),
})
// Add a refinement to ensure at least one of id or claim_id is provided
.refine(data => data.id || data.claim_id, {
  message: "Either id or claim_id must be provided",
  path: ["id"]
});

export const claimRouter = createTRPCRouter({
  // Record inspection for a claim
  // Note: This is kept for backward compatibility but new code should use the inspection domain
  recordInspection: protectedProcedure
    .input(ClaimRecordInspectionInputSchema)
    .output(ClaimWithRelationsOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, claim_id, inspection_datetime } = input;

        // Log the input for debugging
        console.log(`[recordInspection] Input:`, JSON.stringify({ id, claim_id, inspection_datetime }));

        // Use claim_id if provided, otherwise use id
        const claimId = claim_id || id;

        if (!claimId) {
          console.error(`[recordInspection] Missing claim ID. Input:`, JSON.stringify(input));
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Either id or claim_id must be provided'
          });
        }

        console.log(`[recordInspection] Recording inspection for claim ${claimId} at ${inspection_datetime}`);

        // Add audit trail and update status to In Progress
        const { data, error } = await ctx.supabase
          .from('claims')
          .update({
            status: ClaimStatus.IN_PROGRESS, // Use the enum value
            inspection_datetime: inspection_datetime.toISOString(),
            updated_by_employee_id: ctx.user.id
          })
          .eq('id', claimId)
          .select('id, job_number, client_reference, status, instruction, date_of_loss, time_of_loss, type_of_loss, accident_description, claims_handler_name, claims_handler_contact, claims_handler_email, province_id, created_at, created_by_employee_id, updated_by_employee_id, clients(name), vehicles(make, model, registration_number), inspection_datetime')
          .single();

        if (error) {
          console.error("Error recording inspection:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to record inspection for claim ${claim_id}: ${error.message}`,
            cause: error
          });
        }

        if (!data) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to record inspection for claim ${claim_id}: No data returned`
          });
        }

        // Explicitly transform the data to match the expected schema
        const transformedData = {
          ...data,
          // Ensure these fields are properly formatted
          status: data.status || ClaimStatus.IN_PROGRESS,
          date_of_loss: data.date_of_loss ? new Date(data.date_of_loss) : null,
          created_at: data.created_at ? new Date(data.created_at) : null,
          inspection_datetime: data.inspection_datetime ? new Date(data.inspection_datetime) : null,
          // Handle nested objects
          client: data.clients ? (
            Array.isArray(data.clients) ? data.clients[0] ?? null :
            typeof data.clients === 'object' ? data.clients : null
          ) : null,
          vehicle: data.vehicles ? (
            Array.isArray(data.vehicles) ? data.vehicles[0] ?? null :
            typeof data.vehicles === 'object' ? data.vehicles : null
          ) : null,
        };

        // Validate the transformed data against the schema
        return ClaimWithRelationsOutputSchema.parse(transformedData);
      } catch (error) {
        console.error("Error in recordInspection procedure:", error);
        throw error;
      }
    }),
  getAll: publicProcedure
    .output(z.array(ClaimWithRelationsOutputSchema))
    .query(async ({ ctx }) => {
      try {
        // Query claims with joined data from clients and vehicles tables
        const { data, error } = await ctx.supabase
          .from('claims')
          .select('id, job_number, client_reference, status, instruction, date_of_loss, time_of_loss, type_of_loss, accident_description, claims_handler_name, claims_handler_contact, claims_handler_email, province_id, created_at, created_by_employee_id, updated_by_employee_id, inspection_datetime, clients(name), vehicles(make, model, registration_number)');

        if (error) {
          throw new Error(`Failed to fetch claims: ${error.message}`);
        }

        // Map plural keys to singular and validate
        const mappedItems = (data ?? []).map(c => {
          // Handle different possible structures of the nested data
          const client = c.clients ? (
            Array.isArray(c.clients) ? c.clients[0] ?? null :
            typeof c.clients === 'object' ? c.clients : null
          ) : null;

          const vehicle = c.vehicles ? (
            Array.isArray(c.vehicles) ? c.vehicles[0] ?? null :
            typeof c.vehicles === 'object' ? c.vehicles : null
          ) : null;

          return {
            ...c,
            client,
            vehicle,
          };
        });

        return ClaimWithRelationsOutputSchema.array().parse(mappedItems);
      } catch (error) {
        console.error("Error fetching claims:", error);
        throw error;
      }
    }),

  // Get claims with filtering, pagination, and sorting
  list: publicProcedure
    .input(ClaimListParamsSchema)
    .output(ClaimListResponseSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Calculate pagination parameters
        const page = input.page || 1;
        const limit = input.limit || 10;
        const offset = (page - 1) * limit;

        // Determine sort order
        const sortBy = input.sortBy || 'created_at';
        const sortOrder = input.sortOrder || 'desc';

        // Start building the query
        let query = ctx.supabase
          .from('claims')
          .select('id, job_number, client_reference, status, instruction, date_of_loss, time_of_loss, type_of_loss, accident_description, claims_handler_name, claims_handler_contact, claims_handler_email, province_id, created_at, created_by_employee_id, updated_by_employee_id, inspection_datetime, clients(name), vehicles(make, model, registration_number)', { count: 'exact' });

        // Apply status filters based on the filter parameter
        switch (input.filter) {
          case 'active':
            // Use or() to include both the status filter and handle null status
            query = query.or(`status.in.(${ClaimStatus.NEW},${ClaimStatus.APPOINTED},${ClaimStatus.IN_PROGRESS},${ClaimStatus.REPORT_SENT},${ClaimStatus.AUTHORIZED})`);
            break;
          case 'additionals':
            query = query.eq('has_pending_additionals', true);
            break;
          case 'frc':
            query = query.or(`status.in.(${ClaimStatus.FRC_REQUESTED},${ClaimStatus.FRC_ACTIVE})`);
            break;
          case 'finalized':
            query = query.eq('status', ClaimStatus.FRC_FINALIZED);
            break;
          case 'history':
            query = query.or(`status.in.(${ClaimStatus.FRC_FINALIZED},${ClaimStatus.CANCELED})`);
            break;
        }

        // Add search condition if provided
        if (input.search) {
          // Use or() for search conditions
          query = query.or(`job_number.ilike.%${input.search}%,client_reference.ilike.%${input.search}%`);
        }

        // Apply sorting and pagination
        const { data, error, count } = await query
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .range(offset, offset + limit - 1);

        if (error) {
          throw new Error(`Failed to fetch claims: ${error.message}`);
        }

        // Calculate pagination metadata
        const total = count || 0;
        const pages = Math.ceil(total / limit);
        const hasMore = page < pages;

        // Map plural keys to singular and validate
        const mappedItems = (data ?? []).map(c => {

          // Handle different possible structures of the nested data
          const client = c.clients ? (
            Array.isArray(c.clients) ? c.clients[0] ?? null :
            typeof c.clients === 'object' ? c.clients : null
          ) : null;

          const vehicle = c.vehicles ? (
            Array.isArray(c.vehicles) ? c.vehicles[0] ?? null :
            typeof c.vehicles === 'object' ? c.vehicles : null
          ) : null;

          return {
            ...c,
            client,
            vehicle,
          };
        });

        const items = ClaimWithRelationsOutputSchema.array().parse(mappedItems);

        return {
          items,
          pagination: {
            total,
            pages,
            current: page,
            hasMore
          }
        };
      } catch (error) {
        console.error("Error fetching claims:", error);
        throw error;
      }
    }),

  // Get a single claim by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(ClaimWithRelationsOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('claims')
          .select('id, job_number, client_reference, status, instruction, date_of_loss, time_of_loss, type_of_loss, accident_description, claims_handler_name, claims_handler_contact, claims_handler_email, province_id, created_at, created_by_employee_id, updated_by_employee_id, inspection_datetime, clients(name), vehicles(make, model, registration_number)')
          .eq('id', input.id)
          .single();

        if (error) {
          throw new Error(`Failed to fetch claim: ${error.message}`);
        }

        // Map plural keys to singular and validate
        const mappedItem = {
          ...data,
          client: Array.isArray(data?.clients) ? data.clients[0] ?? null : data?.clients ?? null,
          vehicle: Array.isArray(data?.vehicles) ? data.vehicles[0] ?? null : data?.vehicles ?? null,
        };
        return ClaimWithRelationsOutputSchema.parse(mappedItem);
      } catch (error) {
        console.error("Error fetching claim:", error);
        throw error;
      }
    }),

  // Get counts for sidebar badges
  getCounts: publicProcedure
    .output(ClaimCountsOutputSchema)
    .query(async ({ ctx }) => {
      try {
        // Get counts for each status category
        const { data: activeData, error: activeError } = await ctx.supabase
          .from('claims')
          .select('status', { count: 'exact' })
          .or(`status.in.(${ClaimStatus.NEW},${ClaimStatus.APPOINTED},${ClaimStatus.IN_PROGRESS},${ClaimStatus.REPORT_SENT},${ClaimStatus.AUTHORIZED})`);

        const { data: additionalsData, error: additionalsError } = await ctx.supabase
          .from('claims')
          .select('status', { count: 'exact' })
          .eq('has_pending_additionals', true);

        const { data: frcData, error: frcError } = await ctx.supabase
          .from('claims')
          .select('status', { count: 'exact' })
          .or(`status.in.(${ClaimStatus.FRC_REQUESTED},${ClaimStatus.FRC_ACTIVE})`);

        const { data: finalizedData, error: finalizedError } = await ctx.supabase
          .from('claims')
          .select('status', { count: 'exact' })
          .eq('status', ClaimStatus.FRC_FINALIZED);

        const { data: historyData, error: historyError } = await ctx.supabase
          .from('claims')
          .select('status', { count: 'exact' })
          .or(`status.in.(${ClaimStatus.FRC_FINALIZED},${ClaimStatus.CANCELED})`);

        if (activeError || additionalsError || frcError || finalizedError || historyError) {
          throw new Error('Failed to fetch claim counts');
        }

        return {
          active: activeData?.length || 0,
          additionals: additionalsData?.length || 0,
          frc: frcData?.length || 0,
          finalized: finalizedData?.length || 0,
          history: historyData?.length || 0
        };
      } catch (error) {
        console.error("Error fetching claim counts:", error);
        throw error;
      }
    }),

  // --- Mutations ---

  create: protectedProcedure
    .input(ClaimCreateInputSchema)
    .output(ClaimWithRelationsOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // For complex operations involving multiple tables, consider using a database transaction
        // via a Supabase RPC function to ensure data consistency

        const { data, error } = await ctx.supabase
          .from('claims')
          .insert([{
            client_id: input.client_id,
            vehicle_id: input.vehicle_id,
            client_reference: input.client_reference,
            instruction: input.instruction,
            date_of_loss: input.date_of_loss,
            time_of_loss: input.time_of_loss,
            type_of_loss: input.type_of_loss,
            accident_description: input.accident_description,
            claims_handler_name: input.claims_handler_name,
            claims_handler_contact: input.claims_handler_contact,
            claims_handler_email: input.claims_handler_email,
            province_id: input.province_id,
            assigned_employee_id: input.assigned_to_employee_id, // Use the correct column name from the database
            status: ClaimStatus.NEW,
            created_by_employee_id: ctx.user.id, // Add audit trail
            // Note: job_number is auto-generated by a database trigger
          }])
          .select('id, job_number, client_reference, status, instruction, date_of_loss, time_of_loss, type_of_loss, accident_description, claims_handler_name, claims_handler_contact, claims_handler_email, province_id, created_at, created_by_employee_id, updated_by_employee_id, inspection_datetime, clients(name), vehicles(make, model, registration_number)')
          .single();

        if (error) {
          console.error("Error creating claim:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create claim: ${error.message}`,
            cause: error
          });
        }

        if (!data) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create claim: No data returned'
          });
        }

        // Map plural keys to singular and validate
        const mappedItem = {
          ...data,
          client: Array.isArray(data?.clients) ? data.clients[0] ?? null : data?.clients ?? null,
          vehicle: Array.isArray(data?.vehicles) ? data.vehicles[0] ?? null : data?.vehicles ?? null,
        };
        return ClaimWithRelationsOutputSchema.parse(mappedItem);
      } catch (error) {
        console.error("Error in create claim procedure:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Unexpected error creating claim: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error
        });
      }
    }),

  update: protectedProcedure
    .input(ClaimUpdateInputSchema)
    .output(ClaimWithRelationsOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // For complex updates involving multiple tables, consider using a database transaction
        // via a Supabase RPC function to ensure data consistency

        const { id, ...updateData } = input;

        // Add audit trail
        const dataWithAudit = {
          ...updateData,
          updated_by_employee_id: ctx.user.id
        };

        const { data, error } = await ctx.supabase
          .from('claims')
          .update(dataWithAudit)
          .eq('id', id)
          .select('id, job_number, client_reference, status, instruction, date_of_loss, time_of_loss, type_of_loss, accident_description, claims_handler_name, claims_handler_contact, claims_handler_email, province_id, created_at, created_by_employee_id, updated_by_employee_id, inspection_datetime, clients(name), vehicles(make, model, registration_number)')
          .single();

        if (error) {
          console.error("Error updating claim:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to update claim ${id}: ${error.message}`,
            cause: error
          });
        }

        if (!data) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to update claim ${id}: No data returned`
          });
        }

        // Map plural keys to singular and validate
        const mappedItem = {
          ...data,
          client: Array.isArray(data?.clients) ? data.clients[0] ?? null : data?.clients ?? null,
          vehicle: Array.isArray(data?.vehicles) ? data.vehicles[0] ?? null : data?.vehicles ?? null,
        };
        return ClaimWithRelationsOutputSchema.parse(mappedItem);
      } catch (error) {
        console.error("Error in update claim procedure:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Unexpected error updating claim: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error
        });
      }
    }),

  updateStatus: protectedProcedure
    .input(ClaimUpdateStatusInputSchema)
    .output(ClaimWithRelationsOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, status } = input;

        // Add audit trail
        const { data, error } = await ctx.supabase
          .from('claims')
          .update({
            status: status,
            updated_by_employee_id: ctx.user.id
          })
          .eq('id', id)
          .select('id, job_number, client_reference, status, instruction, date_of_loss, time_of_loss, type_of_loss, accident_description, claims_handler_name, claims_handler_contact, claims_handler_email, province_id, created_at, created_by_employee_id, updated_by_employee_id, inspection_datetime, clients(name), vehicles(make, model, registration_number)')
          .single();

        if (error) {
          console.error("Error updating claim status:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to update status for claim ${id}: ${error.message}`,
            cause: error
          });
        }

        if (!data) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to update status for claim ${id}: No data returned`
          });
        }

        // Map plural keys to singular and validate
        const mappedItem = {
          ...data,
          client: Array.isArray(data?.clients) ? data.clients[0] ?? null : data?.clients ?? null,
          vehicle: Array.isArray(data?.vehicles) ? data.vehicles[0] ?? null : data?.vehicles ?? null,
        };
        return ClaimWithRelationsOutputSchema.parse(mappedItem);
      } catch (error) {
        console.error("Error in updateStatus procedure:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Unexpected error updating claim status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Consider using a soft delete approach instead of hard delete
        // by updating a deleted_at timestamp and filtering in queries
        // This would preserve history and allow for recovery

        const { error } = await ctx.supabase
          .from('claims')
          .delete()
          .eq('id', input.id);

        if (error) {
          console.error("Error deleting claim:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to delete claim ${input.id}: ${error.message}`,
            cause: error
          });
        }

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Error in delete claim procedure:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Unexpected error deleting claim: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error
        });
      }
    }),

  // Get claim summary for expandable row
  getSummary: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(ClaimSummaryOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('claims')
          .select('id, job_number, status, date_of_loss, type_of_loss, claims_handler_name, claims_handler_contact, claims_handler_email, clients(name), vehicles(make, model, registration_number)')
          .eq('id', input.id)
          .single();

        if (error) {
          throw new Error(`Failed to fetch claim summary: ${error.message}`);
        }

        if (!data) {
          throw new Error(`Claim not found: ${input.id}`);
        }

        // Format vehicle details
        const vehicleDetails = [
          data.vehicles?.make,
          data.vehicles?.model,
          data.vehicles?.registration_number ? `(${data.vehicles.registration_number})` : null
        ].filter(Boolean).join(' ');

        // Transform the data to match the schema
        const summary = {
          id: data.id,
          job_number: data.job_number,
          client_name: data.clients?.name || 'Unknown Client',
          vehicle_details: vehicleDetails || 'No vehicle details',
          status: data.status as ClaimStatus,
          date_of_loss: data.date_of_loss,
          type_of_loss: data.type_of_loss,
          claims_handler_name: data.claims_handler_name,
          claims_handler_contact: data.claims_handler_contact,
          claims_handler_email: data.claims_handler_email,
          vehicle_make: data.vehicles?.make || null,
          vehicle_model: data.vehicles?.model || null,
          vehicle_registration: data.vehicles?.registration_number || null,
        };

        return ClaimSummaryOutputSchema.parse(summary);
      } catch (error) {
        console.error("Error fetching claim summary:", error);
        throw error;
      }
    }),

  // Get claim details for detail view
  getDetails: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(ClaimDetailsOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Get claim data with related information including loss adjuster and appointments
        const { data, error } = await ctx.supabase
          .from('claims')
          .select(`
            id, job_number, client_id, vehicle_id, client_reference, status, instruction,
            date_of_loss, time_of_loss, type_of_loss, accident_description,
            claims_handler_name, claims_handler_contact, claims_handler_email,
            province_id, created_at, created_by_employee_id, updated_by_employee_id, assigned_employee_id,
            inspection_datetime,
            clients(name),
            vehicles(make, model, registration_number, owner_name, owner_contact),
            appointments(id, appointment_datetime, appointment_status, appointment_duration_minutes,
                        location_type, location_address, appointment_contact_name,
                        appointment_contact_phone, special_instructions)
          `)
          .eq('id', input.id)
          .single();

        if (error) {
          throw new Error(`Failed to fetch claim details: ${error.message}`);
        }

        if (!data) {
          throw new Error(`Claim not found: ${input.id}`);
        }

        // Get loss adjuster information if assigned
        let lossAdjuster = null;
        if (data.assigned_employee_id) {
          const { data: adjusterData, error: adjusterError } = await ctx.supabase
            .from('profiles')
            .select('id, full_name, email, phone, role')
            .eq('id', data.assigned_employee_id)
            .single();

          if (!adjusterError && adjusterData) {
            lossAdjuster = adjusterData;
          }
        }

        // Format vehicle details
        const vehicleDetails = [
          data.vehicles?.make,
          data.vehicles?.model,
          data.vehicles?.registration_number ? `(${data.vehicles.registration_number})` : null
        ].filter(Boolean).join(' ');

        // Sort appointments by date (newest first) if any exist
        const appointments = data.appointments || [];
        appointments.sort((a, b) => {
          if (!a.appointment_datetime) return 1;
          if (!b.appointment_datetime) return -1;
          return new Date(b.appointment_datetime).getTime() - new Date(a.appointment_datetime).getTime();
        });

        // Get the latest appointment if any
        const latestAppointment = appointments.length > 0 ? appointments[0] : null;

        // Transform the data to match the schema
        const details = {
          id: data.id,
          job_number: data.job_number,
          client_id: data.client_id,
          vehicle_id: data.vehicle_id,
          client_name: data.clients?.name || 'Unknown Client',
          vehicle_details: vehicleDetails || 'No vehicle details',
          client_reference: data.client_reference,
          status: data.status as ClaimStatus,
          instruction: data.instruction,
          date_of_loss: data.date_of_loss,
          time_of_loss: data.time_of_loss,
          type_of_loss: data.type_of_loss,
          accident_description: data.accident_description,
          claims_handler_name: data.claims_handler_name,
          claims_handler_contact: data.claims_handler_contact,
          claims_handler_email: data.claims_handler_email,
          province_id: data.province_id,
          created_at: data.created_at,
          instructed_date: data.created_at, // Alias created_at as instructed_date
          created_by_employee_id: data.created_by_employee_id,
          updated_by_employee_id: data.updated_by_employee_id,
          vehicle_make: data.vehicles?.make || null,
          vehicle_model: data.vehicles?.model || null,
          vehicle_registration: data.vehicles?.registration_number || null,
          assigned_to_employee_id: data.assigned_employee_id || null,
          loss_adjuster: lossAdjuster,
          insured_name: data.vehicles?.owner_name || null,
          insured_contact: data.vehicles?.owner_contact || null,
          inspection_datetime: data.inspection_datetime || null,
          appointments: appointments,
          latest_appointment: latestAppointment
        };

        return ClaimDetailsOutputSchema.parse(details);
      } catch (error) {
        console.error("Error fetching claim details:", error);
        throw error;
      }
    }),
});
