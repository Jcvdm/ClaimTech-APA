// src/lib/api/domains/inspections/types.ts
import { z } from "zod";
import { ClaimStatus } from "@/lib/api/domains/claims/types";

// Define the schema for additional tyres
export const AdditionalTyreSchema = z.object({
  id: z.string(),
  label: z.string(),
  face_photo_path: z.string().nullable(),
  measurement_photo_path: z.string().nullable(),
  tread_photo_path: z.string().nullable(),
  make: z.string(),
  size: z.string(),
  load_speed: z.string(),
});

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
  overall_condition: z.enum(["excellent", "good", "fair", "poor", "very_poor"]).optional(),

  // Interior section
  mileage_photo_path: z.string().optional(),
  radio_present: z.boolean().optional(),
  radio_make: z.string().optional(),
  radio_model: z.string().optional(),
  radio_photo_path: z.string().optional(),
  gear_type: z.enum(["manual", "automatic", "other"]).optional(),
  interior_front_photo_path: z.string().optional(),
  interior_rear_photo_path: z.string().optional(),
  leather_seats: z.boolean().optional(),
  interior_condition: z.enum(["no_damage", "good", "poor", "very_poor"]).optional(),
  srs_activated: z.boolean().optional(),
  srs_damage_photo_path_1: z.string().optional(),
  srs_damage_photo_path_2: z.string().optional(),
  srs_damage_photo_path_3: z.string().optional(),
  srs_damage_photo_path_4: z.string().optional(),
  jack_tools_present: z.boolean().optional(),
  jack_tools_photo_path: z.string().optional(),

  // Mechanical section
  engine_bay_photo_path: z.string().optional(),
  battery_photo_path: z.string().optional(),
  mechanical_condition: z.enum(["working", "not_working", "other"]).optional(),
  electrical_condition: z.enum(["working", "not_working", "other"]).optional(),

  // Tyres section - standard tyres
  tyre_rf_face_photo_path: z.string().optional(),
  tyre_rf_measurement_photo_path: z.string().optional(),
  tyre_rf_tread_photo_path: z.string().optional(),
  tyre_rf_make: z.string().optional(),
  tyre_rf_size: z.string().optional(),
  tyre_rf_load_speed: z.string().optional(),

  tyre_rr_face_photo_path: z.string().optional(),
  tyre_rr_measurement_photo_path: z.string().optional(),
  tyre_rr_tread_photo_path: z.string().optional(),
  tyre_rr_make: z.string().optional(),
  tyre_rr_size: z.string().optional(),
  tyre_rr_load_speed: z.string().optional(),

  tyre_lr_face_photo_path: z.string().optional(),
  tyre_lr_measurement_photo_path: z.string().optional(),
  tyre_lr_tread_photo_path: z.string().optional(),
  tyre_lr_make: z.string().optional(),
  tyre_lr_size: z.string().optional(),
  tyre_lr_load_speed: z.string().optional(),

  tyre_lf_face_photo_path: z.string().optional(),
  tyre_lf_measurement_photo_path: z.string().optional(),
  tyre_lf_tread_photo_path: z.string().optional(),
  tyre_lf_make: z.string().optional(),
  tyre_lf_size: z.string().optional(),
  tyre_lf_load_speed: z.string().optional(),

  tyre_spare_face_photo_path: z.string().optional(),
  tyre_spare_measurement_photo_path: z.string().optional(),
  tyre_spare_tread_photo_path: z.string().optional(),
  tyre_spare_make: z.string().optional(),
  tyre_spare_size: z.string().optional(),
  tyre_spare_load_speed: z.string().optional(),

  // Additional tyres for larger vehicles
  additional_tyres: z.array(AdditionalTyreSchema).optional(),

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
  overall_condition: z.enum(["excellent", "good", "fair", "poor", "very_poor"]).nullable(),

  // Interior section
  mileage_photo_path: z.string().nullable(),
  radio_present: z.boolean().nullable(),
  radio_make: z.string().nullable(),
  radio_model: z.string().nullable(),
  radio_photo_path: z.string().nullable(),
  gear_type: z.enum(["manual", "automatic", "other"]).nullable(),
  interior_front_photo_path: z.string().nullable(),
  interior_rear_photo_path: z.string().nullable(),
  leather_seats: z.boolean().nullable(),
  interior_condition: z.enum(["no_damage", "good", "poor", "very_poor"]).nullable(),
  srs_activated: z.boolean().nullable(),
  srs_damage_photo_path_1: z.string().nullable(),
  srs_damage_photo_path_2: z.string().nullable(),
  srs_damage_photo_path_3: z.string().nullable(),
  srs_damage_photo_path_4: z.string().nullable(),
  jack_tools_present: z.boolean().nullable(),
  jack_tools_photo_path: z.string().nullable(),

  // Mechanical section
  engine_bay_photo_path: z.string().nullable(),
  battery_photo_path: z.string().nullable(),
  mechanical_condition: z.enum(["working", "not_working", "other"]).nullable(),
  electrical_condition: z.enum(["working", "not_working", "other"]).nullable(),

  // Tyres section - standard tyres
  tyre_rf_face_photo_path: z.string().nullable(),
  tyre_rf_measurement_photo_path: z.string().nullable(),
  tyre_rf_tread_photo_path: z.string().nullable(),
  tyre_rf_make: z.string().nullable(),
  tyre_rf_size: z.string().nullable(),
  tyre_rf_load_speed: z.string().nullable(),

  tyre_rr_face_photo_path: z.string().nullable(),
  tyre_rr_measurement_photo_path: z.string().nullable(),
  tyre_rr_tread_photo_path: z.string().nullable(),
  tyre_rr_make: z.string().nullable(),
  tyre_rr_size: z.string().nullable(),
  tyre_rr_load_speed: z.string().nullable(),

  tyre_lr_face_photo_path: z.string().nullable(),
  tyre_lr_measurement_photo_path: z.string().nullable(),
  tyre_lr_tread_photo_path: z.string().nullable(),
  tyre_lr_make: z.string().nullable(),
  tyre_lr_size: z.string().nullable(),
  tyre_lr_load_speed: z.string().nullable(),

  tyre_lf_face_photo_path: z.string().nullable(),
  tyre_lf_measurement_photo_path: z.string().nullable(),
  tyre_lf_tread_photo_path: z.string().nullable(),
  tyre_lf_make: z.string().nullable(),
  tyre_lf_size: z.string().nullable(),
  tyre_lf_load_speed: z.string().nullable(),

  tyre_spare_face_photo_path: z.string().nullable(),
  tyre_spare_measurement_photo_path: z.string().nullable(),
  tyre_spare_tread_photo_path: z.string().nullable(),
  tyre_spare_make: z.string().nullable(),
  tyre_spare_size: z.string().nullable(),
  tyre_spare_load_speed: z.string().nullable(),

  // Additional tyres for larger vehicles
  additional_tyres: z.array(AdditionalTyreSchema).nullable(),

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

// Define the schema for getting an inspection by ID
export const InspectionGetByIdInputSchema = z.object({
  id: z.string().uuid(),
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

// Define the schema for updating an inspection
export const InspectionUpdateInputSchema = z.object({
  id: z.string().uuid(),
  claim_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),

  // Registration details
  registration_number: z.string().optional(),
  registration_photo_path: z.string().optional(),

  // License disc details
  license_disc_present: z.boolean().optional(),
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
  overall_condition: z.enum(["excellent", "good", "fair", "poor", "very_poor"]).optional(),

  // Interior section
  mileage_photo_path: z.string().optional(),
  radio_present: z.boolean().optional(),
  radio_make: z.string().optional(),
  radio_model: z.string().optional(),
  radio_photo_path: z.string().optional(),
  gear_type: z.enum(["manual", "automatic", "other"]).optional(),
  interior_front_photo_path: z.string().optional(),
  interior_rear_photo_path: z.string().optional(),
  leather_seats: z.boolean().optional(),
  interior_condition: z.enum(["no_damage", "good", "poor", "very_poor"]).optional(),
  srs_activated: z.boolean().optional(),
  srs_damage_photo_path_1: z.string().optional(),
  srs_damage_photo_path_2: z.string().optional(),
  srs_damage_photo_path_3: z.string().optional(),
  srs_damage_photo_path_4: z.string().optional(),
  jack_tools_present: z.boolean().optional(),
  jack_tools_photo_path: z.string().optional(),

  // Mechanical section
  engine_bay_photo_path: z.string().optional(),
  battery_photo_path: z.string().optional(),
  mechanical_condition: z.enum(["working", "not_working", "other"]).optional(),
  electrical_condition: z.enum(["working", "not_working", "other"]).optional(),

  // Tyres section - standard tyres
  tyre_rf_face_photo_path: z.string().optional(),
  tyre_rf_measurement_photo_path: z.string().optional(),
  tyre_rf_tread_photo_path: z.string().optional(),
  tyre_rf_make: z.string().optional(),
  tyre_rf_size: z.string().optional(),
  tyre_rf_load_speed: z.string().optional(),

  tyre_rr_face_photo_path: z.string().optional(),
  tyre_rr_measurement_photo_path: z.string().optional(),
  tyre_rr_tread_photo_path: z.string().optional(),
  tyre_rr_make: z.string().optional(),
  tyre_rr_size: z.string().optional(),
  tyre_rr_load_speed: z.string().optional(),

  tyre_lr_face_photo_path: z.string().optional(),
  tyre_lr_measurement_photo_path: z.string().optional(),
  tyre_lr_tread_photo_path: z.string().optional(),
  tyre_lr_make: z.string().optional(),
  tyre_lr_size: z.string().optional(),
  tyre_lr_load_speed: z.string().optional(),

  tyre_lf_face_photo_path: z.string().optional(),
  tyre_lf_measurement_photo_path: z.string().optional(),
  tyre_lf_tread_photo_path: z.string().optional(),
  tyre_lf_make: z.string().optional(),
  tyre_lf_size: z.string().optional(),
  tyre_lf_load_speed: z.string().optional(),

  tyre_spare_face_photo_path: z.string().optional(),
  tyre_spare_measurement_photo_path: z.string().optional(),
  tyre_spare_tread_photo_path: z.string().optional(),
  tyre_spare_make: z.string().optional(),
  tyre_spare_size: z.string().optional(),
  tyre_spare_load_speed: z.string().optional(),

  // Additional tyres for larger vehicles
  additional_tyres: z.array(AdditionalTyreSchema).optional(),

  // Damage assessment
  damage_description: z.string().optional(),
  damage_photo1_path: z.string().optional(),
  damage_photo2_path: z.string().optional(),
  damage_photo3_path: z.string().optional(),
  damage_photo4_path: z.string().optional(),

  // Notes
  notes: z.string().optional(),
});

// Export types
export type InspectionCreateInput = z.infer<typeof InspectionCreateInputSchema>;
export type InspectionUpdateInput = z.infer<typeof InspectionUpdateInputSchema>;
export type Inspection = z.infer<typeof InspectionOutputSchema>;
export type InspectionGetByClaimInput = z.infer<typeof InspectionGetByClaimInputSchema>;
export type InspectionGetByIdInput = z.infer<typeof InspectionGetByIdInputSchema>;
export type InspectionRecordInput = z.infer<typeof InspectionRecordInputSchema>;
