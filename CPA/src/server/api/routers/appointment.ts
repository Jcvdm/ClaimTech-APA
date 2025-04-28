import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

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
  created_at: z.string().datetime(),
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
});
