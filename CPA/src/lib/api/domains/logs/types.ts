import { z } from "zod";

// Define the log types
export enum ClaimLogType {
  CLAIM_CREATED = "claim_created",
  CLAIM_UPDATED = "claim_updated",
  CLAIM_STATUS_CHANGED = "claim_status_changed",
  APPOINTMENT_CREATED = "appointment_created",
  APPOINTMENT_UPDATED = "appointment_updated",
  APPOINTMENT_CANCELED = "appointment_canceled",
  APPOINTMENT_RESCHEDULED = "appointment_rescheduled",
  INSPECTION_STARTED = "inspection_started",
  INSPECTION_COMPLETED = "inspection_completed",
  ESTIMATE_CREATED = "estimate_created",
  ESTIMATE_UPDATED = "estimate_updated",
  ADDITIONAL_CREATED = "additional_created",
  ADDITIONAL_APPROVED = "additional_approved",
  ADDITIONAL_REJECTED = "additional_rejected",
  MANUAL_LOG = "manual_log", // For logs added manually by users
}

// Schema for creating a log entry
export const ClaimLogCreateInputSchema = z.object({
  claim_id: z.string().uuid(),
  log_type: z.nativeEnum(ClaimLogType),
  message: z.string(),
  details: z.record(z.any()).optional(),
});

// Schema for the log entry returned from the database
export const ClaimLogOutputSchema = z.object({
  id: z.string().uuid(),
  claim_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  log_type: z.nativeEnum(ClaimLogType),
  message: z.string(),
  details: z.record(z.any()).nullable(),
  created_at: z.string().datetime(),
});

// Types derived from the schemas
export type ClaimLogCreateInput = z.infer<typeof ClaimLogCreateInputSchema>;
export type ClaimLog = z.infer<typeof ClaimLogOutputSchema>;

// Schema for querying logs
export const ClaimLogsQueryInputSchema = z.object({
  claim_id: z.string().uuid(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  log_types: z.array(z.nativeEnum(ClaimLogType)).optional(),
});

export type ClaimLogsQueryInput = z.infer<typeof ClaimLogsQueryInputSchema>;
