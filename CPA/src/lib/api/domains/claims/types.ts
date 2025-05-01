// src/lib/api/domains/claims/types.ts
import { z } from "zod";
import { type RouterOutputs, type RouterInputs } from "@/lib/api/types";
import { type PaginatedResponse } from "@/lib/api/types";

// Define Zod schemas for validation
export const ClaimFilterSchema = z.enum([
  'active',
  'additionals',
  'frc',
  'finalized',
  'history',
]);

export const ClaimListParamsSchema = z.object({
  filter: ClaimFilterSchema.default('active'),
  page: z.number().default(1),
  limit: z.number().default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Export types derived from tRPC
export type ClaimWithRelations = RouterOutputs["claim"]["getAll"][number];
export type ClaimListItem = ClaimWithRelations;
export type ClaimListParams = z.infer<typeof ClaimListParamsSchema>;
export type ClaimListResponse = PaginatedResponse<ClaimWithRelations>;
export type ClaimCountsResponse = {
  active: number;
  additionals: number;
  frc: number;
  finalized: number;
  history: number;
};
export type ClaimCreateInput = RouterInputs["claim"]["create"];
export type ClaimUpdateInput = RouterInputs["claim"]["update"];

// Claim summary type for expandable rows
export interface ClaimSummary {
  id: string;
  job_number: string | null;
  client_name: string;
  vehicle_details: string;
  status: ClaimStatus;
  date_of_loss: string;
  type_of_loss: string | null;
  claims_handler_name: string | null;
  claims_handler_contact: string | null;
  claims_handler_email: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_registration: string | null;
}

// Loss adjuster type
export interface LossAdjuster {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
}

// Appointment type
export interface Appointment {
  id: string;
  appointment_datetime: string | null;
  appointment_status: string | null;
  appointment_duration_minutes: number | null;
  location_type: string | null;
  location_address: string | null;
  appointment_contact_name: string | null;
  appointment_contact_phone: string | null;
  special_instructions: string | null;
}

// Claim details type for detailed view
export interface ClaimDetails extends ClaimSummary {
  client_id: string;
  vehicle_id: string;
  client_reference: string | null;
  instruction: ClaimInstruction | null;
  time_of_loss: string | null;
  accident_description: string | null;
  province_id: string | null;
  created_at: Date | null;
  instructed_date: Date | null; // Alias for created_at
  created_by_employee_id: string | null;
  updated_by_employee_id: string | null;
  assigned_to_employee_id: string | null;
  loss_adjuster: LossAdjuster | null;
  insured_name: string | null;
  insured_contact: string | null;
  appointments: Appointment[];
  latest_appointment?: Appointment | null;
  inspection_datetime?: string | null; // Date and time when inspection was performed
}

// Define type of loss enum
export enum TypeOfLoss {
  ACCIDENT = 'Accident',
  THEFT = 'Theft',
  FIRE = 'Fire',
  FLOOD = 'Flood',
  HAIL = 'Hail',
  VANDALISM = 'Vandalism',
  OTHER = 'Other'
}

// Add types for optional fields
export type ClaimCreateInputWithOptionalFields = ClaimCreateInput & {
  time_of_loss?: string | null;
  type_of_loss?: TypeOfLoss | null;
  province_id?: string | null;
  assigned_to_employee_id?: string | null;
};

// Claim status enum (matching database enum)
export enum ClaimStatus {
  NEW = 'New',
  APPOINTED = 'Appointed',
  IN_PROGRESS = 'In Progress',
  REPORT_SENT = 'Report Sent',
  AUTHORIZED = 'Authorized',
  FRC_REQUESTED = 'FRC Requested',
  FRC_ACTIVE = 'FRC Active',
  FRC_FINALIZED = 'FRC Finalized',
  CANCELED = 'Canceled'
}

// Claim instruction enum (matching database enum)
export enum ClaimInstruction {
  AGREE_ONLY = 'Agree Only',
  AGREE_AND_AUTHORIZE = 'Agree and Authorize'
}
