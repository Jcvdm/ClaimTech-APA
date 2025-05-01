// src/server/api/routers/inspection.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { 
  InspectionCreateInputSchema, 
  InspectionOutputSchema,
  InspectionGetByClaimInputSchema
} from "@/lib/api/domains/inspections/types";
import { TRPCError } from "@trpc/server";
import { ClaimStatus } from "@/lib/api/domains/claims/types";

export const inspectionRouter = createTRPCRouter({
  // Create a new inspection
  create: protectedProcedure
    .input(InspectionCreateInputSchema)
    .output(InspectionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Start a transaction
        const { data: inspection, error: inspectionError } = await ctx.supabase
          .from("vehicle_inspections")
          .insert({
            claim_id: input.claim_id,
            vehicle_id: input.vehicle_id,
            inspection_datetime: new Date().toISOString(),
            inspector_id: ctx.user.id,
            
            // Registration details
            registration_number: input.registration_number,
            registration_photo_path: input.registration_photo_path,
            
            // License disc details
            license_disc_present: input.license_disc_present,
            license_disc_expiry: input.license_disc_expiry,
            license_disc_photo_path: input.license_disc_photo_path,
            
            // VIN details
            vin_number: input.vin_number,
            vin_dash_photo_path: input.vin_dash_photo_path,
            vin_plate_photo_path: input.vin_plate_photo_path,
            vin_number_photo_path: input.vin_number_photo_path,
            
            // 360 view photos
            front_view_photo_path: input.front_view_photo_path,
            right_front_view_photo_path: input.right_front_view_photo_path,
            right_side_view_photo_path: input.right_side_view_photo_path,
            right_rear_view_photo_path: input.right_rear_view_photo_path,
            rear_view_photo_path: input.rear_view_photo_path,
            left_rear_view_photo_path: input.left_rear_view_photo_path,
            left_side_view_photo_path: input.left_side_view_photo_path,
            left_front_view_photo_path: input.left_front_view_photo_path,
            
            // Notes
            notes: input.notes,
          })
          .select("*")
          .single();

        if (inspectionError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create inspection: ${inspectionError.message}`,
            cause: inspectionError,
          });
        }

        // Update the claim status to IN_PROGRESS
        const { error: claimError } = await ctx.supabase
          .from("claims")
          .update({
            status: ClaimStatus.IN_PROGRESS,
            updated_by_employee_id: ctx.user.id,
          })
          .eq("id", input.claim_id);

        if (claimError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update claim status: ${claimError.message}`,
            cause: claimError,
          });
        }

        return inspection;
      } catch (error) {
        console.error("Error in create inspection procedure:", error);
        throw error;
      }
    }),
    
  // Get inspections by claim ID
  getByClaim: protectedProcedure
    .input(InspectionGetByClaimInputSchema)
    .output(z.array(InspectionOutputSchema))
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from("vehicle_inspections")
          .select("*")
          .eq("claim_id", input.claim_id)
          .order("created_at", { ascending: false });

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to get inspections: ${error.message}`,
            cause: error,
          });
        }

        return data || [];
      } catch (error) {
        console.error("Error in getByClaim procedure:", error);
        throw error;
      }
    }),
});
