// src/lib/api/domains/inspections/types.ts
import { z } from "zod";
import { ClaimStatus } from "@/lib/api/domains/claims/types";

// Define the schema for creating an inspection
export const InspectionCreateInputSchema = z.object({
  claim_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),

  // Registration details
  registration_number: z.string().optional(),
  registration_photo_path: z.string().optional(),

  // License disc details
  license_disc_present: z.boolean().default(false),
  license_disc_expiry: z.date().optional().nullable(),
  license_disc_photo_path: z.string().optional(),

  // VIN details
  vin_number: z.string().optional(),
  vin_dash_photo_path: z.string().optional(),
  vin_plate_photo_path: z.string().optional(),
  vin_number_photo_path: z.string().optional(),

  // 360 view photos
  front_view_photo_path: z.string().optional(),
  right_front_view_photo_path: z.string().optional(),
  right_side_view_photo_path: z.string().optional(),
  right_rear_view_photo_path: z.string().optional(),
  rear_view_photo_path: z.string().optional(),
  left_rear_view_photo_path: z.string().optional(),
  left_side_view_photo_path: z.string().optional(),
  left_front_view_photo_path: z.string().optional(),

  // Notes
  notes: z.string().optional(),
});

// Define the schema for inspection output
export const InspectionOutputSchema = z.object({
  id: z.string().uuid(),
  claim_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  inspection_datetime: z.coerce.date(),
  inspector_id: z.string().uuid(),

  // Registration details
  registration_number: z.string().nullable(),
  registration_photo_path: z.string().nullable(),

  // License disc details
  license_disc_present: z.boolean().default(false),
  license_disc_expiry: z.coerce.date().nullable(),
  license_disc_photo_path: z.string().nullable(),

  // VIN details
  vin_number: z.string().nullable(),
  vin_dash_photo_path: z.string().nullable(),
  vin_plate_photo_path: z.string().nullable(),
  vin_number_photo_path: z.string().nullable(),

  // 360 view photos
  front_view_photo_path: z.string().nullable(),
  right_front_view_photo_path: z.string().nullable(),
  right_side_view_photo_path: z.string().nullable(),
  right_rear_view_photo_path: z.string().nullable(),
  rear_view_photo_path: z.string().nullable(),
  left_rear_view_photo_path: z.string().nullable(),
  left_side_view_photo_path: z.string().nullable(),
  left_front_view_photo_path: z.string().nullable(),

  // Notes
  notes: z.string().nullable(),

  // Metadata
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

// Define the schema for getting inspections by claim
export const InspectionGetByClaimInputSchema = z.object({
  claim_id: z.string().uuid(),
});

// Define the schema for recording an inspection (simplified version)
export const InspectionRecordInputSchema = z.object({
  // Accept either id or claim_id for backward compatibility
  id: z.string().uuid().optional(),
  claim_id: z.string().uuid().optional(),
  inspection_datetime: z.date(),
})
// Add a refinement to ensure at least one of id or claim_id is provided
.refine(data => data.id || data.claim_id, {
  message: "Either id or claim_id must be provided",
  path: ["claim_id"]
});

// Export types
export type InspectionCreateInput = z.infer<typeof InspectionCreateInputSchema>;
export type Inspection = z.infer<typeof InspectionOutputSchema>;
export type InspectionGetByClaimInput = z.infer<typeof InspectionGetByClaimInputSchema>;
export type InspectionRecordInput = z.infer<typeof InspectionRecordInputSchema>;
