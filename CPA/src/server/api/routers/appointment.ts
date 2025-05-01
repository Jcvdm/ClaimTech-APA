import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Define location type enum
const LocationTypeEnum = z.enum(["client", "tow yard", "workshop"]);

// Define input schema for creating an appointment
const AppointmentCreateInputSchema = z.object({
  claim_id: z.string().uuid(),
  appointment_datetime: z.string().datetime(),
  appointment_duration_minutes: z.number().min(15).max(240),
  location_type: z.string(),
  location_address: z.string(),
  appointment_contact_name: z.string(),
  appointment_contact_phone: z.string(),
  special_instructions: z.string().nullable().optional(),
  appointment_status: z.string().default('pending'),
  repairer_id: z.string().uuid().nullable().optional(),
});

// Define input schema for updating an appointment
const AppointmentUpdateInputSchema = z.object({
  id: z.string().uuid(),
  claim_id: z.string().uuid(), // Needed for cache invalidation
  appointment_datetime: z.string().datetime(),
  location_type: LocationTypeEnum,
  location_address: z.string(),
  appointment_contact_name: z.string(),
  appointment_contact_phone: z.string(),
  special_instructions: z.string().nullable().optional(),
  appointment_status: z.string(),
});

// Define input schema for updating just the appointment status
const AppointmentStatusUpdateInputSchema = z.object({
  id: z.string().uuid(),
  claim_id: z.string().uuid(), // Needed for cache invalidation
  appointment_status: z.string(),
  reason: z.string().optional(), // Optional reason for status change
});

// Define output schema for appointment
const AppointmentOutputSchema = z.object({
  id: z.string().uuid(),
  claim_id: z.string().uuid(),
  scheduled_by_employee_id: z.string().uuid(),
  repairer_id: z.string().uuid().nullable(),
  appointment_status: z.string(),
  appointment_datetime: z.string().nullable(),
  appointment_duration_minutes: z.number().nullable(),
  location_type: z.string(),
  location_address: z.string().nullable(),
  appointment_contact_name: z.string().nullable(),
  appointment_contact_phone: z.string().nullable(),
  special_instructions: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  // Add other fields that might be returned by Supabase but not explicitly defined
  inspection_actual_start_datetime: z.string().nullable().optional(),
  inspection_actual_end_datetime: z.string().nullable().optional(),
  availability_notes: z.string().nullable().optional(),
  appointment_contact_email: z.string().nullable().optional(),
});

export const appointmentRouter = createTRPCRouter({
  // Create a new appointment
  create: protectedProcedure
    .input(AppointmentCreateInputSchema)
    .output(AppointmentOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('appointments')
          .insert([{
            claim_id: input.claim_id,
            scheduled_by_employee_id: ctx.user.id,
            repairer_id: input.repairer_id || null,
            appointment_status: input.appointment_status,
            appointment_datetime: input.appointment_datetime,
            appointment_duration_minutes: input.appointment_duration_minutes,
            location_type: input.location_type,
            location_address: input.location_address,
            appointment_contact_name: input.appointment_contact_name,
            appointment_contact_phone: input.appointment_contact_phone,
            special_instructions: input.special_instructions,
          }])
          .select('*')
          .single();

        if (error) {
          console.error("Error creating appointment:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create appointment: ${error.message}`,
            cause: error
          });
        }

        if (!data) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create appointment: No data returned'
          });
        }

        // Update claim status to "Appointed" if it's currently "New"
        const { data: claimData, error: claimError } = await ctx.supabase
          .from('claims')
          .select('status')
          .eq('id', input.claim_id)
          .single();

        if (!claimError && claimData && claimData.status === 'New') {
          await ctx.supabase
            .from('claims')
            .update({
              status: 'Appointed',
              updated_by_employee_id: ctx.user.id
            })
            .eq('id', input.claim_id);
        }

        // Validate the data against the schema
        return AppointmentOutputSchema.parse(data);
      } catch (error) {
        console.error("Error in create appointment procedure:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Unexpected error creating appointment: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error
        });
      }
    }),

  // Get appointments for a claim
  getByClaim: protectedProcedure
    .input(z.object({ claim_id: z.string().uuid() }))
    .output(z.array(AppointmentOutputSchema))
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('appointments')
          .select('*')
          .eq('claim_id', input.claim_id)
          .order('appointment_datetime', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch appointments: ${error.message}`);
        }

        return AppointmentOutputSchema.array().parse(data || []);
      } catch (error) {
        console.error("Error fetching appointments:", error);
        throw error;
      }
    }),

  // Update an existing appointment
  update: protectedProcedure
    .input(AppointmentUpdateInputSchema)
    .output(AppointmentOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;

        const { data, error } = await ctx.supabase
          .from('appointments')
          .update({
            appointment_datetime: updateData.appointment_datetime,
            location_type: updateData.location_type,
            location_address: updateData.location_address,
            appointment_contact_name: updateData.appointment_contact_name,
            appointment_contact_phone: updateData.appointment_contact_phone,
            special_instructions: updateData.special_instructions,
            appointment_status: updateData.appointment_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*')
          .single();

        if (error) {
          console.error("Error updating appointment:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to update appointment: ${error.message}`,
            cause: error
          });
        }

        if (!data) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update appointment: No data returned'
          });
        }

        // Validate the data against the schema
        return AppointmentOutputSchema.parse(data);
      } catch (error) {
        console.error("Error in update appointment procedure:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Unexpected error updating appointment: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error
        });
      }
    }),

  // Update just the status of an appointment
  updateStatus: protectedProcedure
    .input(AppointmentStatusUpdateInputSchema)
    .output(AppointmentOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, claim_id, appointment_status, reason } = input;

        // Update the appointment status
        const { data, error } = await ctx.supabase
          .from('appointments')
          .update({
            appointment_status,
            special_instructions: reason ?
              `Status changed to ${appointment_status}. Reason: ${reason}` :
              undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*')
          .single();

        if (error) {
          console.error("Error updating appointment status:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to update appointment status: ${error.message}`,
            cause: error
          });
        }

        if (!data) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update appointment status: No data returned'
          });
        }

        // If the appointment is cancelled, update the claim status if needed
        if (appointment_status === 'cancelled') {
          // Check if there are any other active appointments for this claim
          const { data: otherAppointments, error: countError } = await ctx.supabase
            .from('appointments')
            .select('id')
            .eq('claim_id', claim_id)
            .neq('id', id)
            .neq('appointment_status', 'cancelled')
            .neq('appointment_status', 'completed');

          // If no other active appointments and claim status is "Appointed", update to "New"
          if (!countError && (!otherAppointments || otherAppointments.length === 0)) {
            const { data: claimData, error: claimError } = await ctx.supabase
              .from('claims')
              .select('status')
              .eq('id', claim_id)
              .single();

            if (!claimError && claimData && claimData.status === 'Appointed') {
              await ctx.supabase
                .from('claims')
                .update({
                  status: 'New',
                  updated_by_employee_id: ctx.user.id
                })
                .eq('id', claim_id);
            }
          }
        }

        // Validate the data against the schema
        return AppointmentOutputSchema.parse(data);
      } catch (error) {
        console.error("Error in update appointment status procedure:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Unexpected error updating appointment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error
        });
      }
    }),
});
