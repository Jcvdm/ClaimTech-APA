import { apiClient } from "@/lib/api/client";
import { ClaimLog, ClaimLogCreateInput, ClaimLogType } from "./types";
import { MutationOptions } from "@/lib/api/types";
import { toast } from "sonner";

/**
 * Create a log entry
 */
export const createLog = (
  input: ClaimLogCreateInput,
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return apiClient.mutation<ClaimLog, ClaimLogCreateInput>(
    () => apiClient.raw.log.create.useMutation(),
    {
      onSuccess: (data, variables) => {
        // Don't show a toast for every log creation
        options?.onSuccess?.(data, variables);
      },
      onError: (error) => {
        toast.error(`Failed to create log: ${error.message}`);
        options?.onError?.(error);
      },
      ...options,
    }
  );
};

/**
 * Delete a log entry (admin only)
 */
export const deleteLog = (
  id: string,
  options?: MutationOptions<{ success: boolean }, string>
) => {
  return apiClient.mutation<{ success: boolean }, string>(
    () => apiClient.raw.log.delete.useMutation(),
    {
      onSuccess: (data, variables) => {
        toast.success("Log entry deleted");
        options?.onSuccess?.(data, variables);
      },
      onError: (error) => {
        toast.error(`Failed to delete log: ${error.message}`);
        options?.onError?.(error);
      },
      ...options,
    }
  );
};

/**
 * Helper functions to create specific types of logs
 */

// Create a log for claim creation
export const logClaimCreated = (
  claimId: string,
  claimData: any,
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return createLog(
    {
      claim_id: claimId,
      log_type: ClaimLogType.CLAIM_CREATED,
      message: `Claim created`,
      details: { claim: claimData },
    },
    options
  );
};

// Create a log for claim status change
export const logClaimStatusChanged = (
  claimId: string,
  oldStatus: string,
  newStatus: string,
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return createLog(
    {
      claim_id: claimId,
      log_type: ClaimLogType.CLAIM_STATUS_CHANGED,
      message: `Claim status changed from "${oldStatus}" to "${newStatus}"`,
      details: { oldStatus, newStatus },
    },
    options
  );
};

// Create a log for appointment creation
export const logAppointmentCreated = (
  claimId: string,
  appointmentData: any,
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  const appointmentDate = new Date(appointmentData.appointment_datetime).toLocaleString();
  return createLog(
    {
      claim_id: claimId,
      log_type: ClaimLogType.APPOINTMENT_CREATED,
      message: `Appointment scheduled for ${appointmentDate}`,
      details: { appointment: appointmentData },
    },
    options
  );
};

// Create a log for appointment rescheduling
export const logAppointmentRescheduled = (
  claimId: string,
  oldDate: string,
  newDate: string,
  appointmentData: any,
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  const oldDateFormatted = new Date(oldDate).toLocaleString();
  const newDateFormatted = new Date(newDate).toLocaleString();
  return createLog(
    {
      claim_id: claimId,
      log_type: ClaimLogType.APPOINTMENT_RESCHEDULED,
      message: `Appointment rescheduled from ${oldDateFormatted} to ${newDateFormatted}`,
      details: { appointment: appointmentData, oldDate, newDate },
    },
    options
  );
};

// Create a log for inspection started
export const logInspectionStarted = (
  claimId: string,
  inspectionData: any,
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  const inspectionDate = new Date(inspectionData.inspection_datetime).toLocaleString();
  return createLog(
    {
      claim_id: claimId,
      log_type: ClaimLogType.INSPECTION_STARTED,
      message: `Inspection started at ${inspectionDate}`,
      details: { inspection: inspectionData },
    },
    options
  );
};

// Create a log for inspection completed
export const logInspectionCompleted = (
  claimId: string,
  inspectionData: any,
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return createLog(
    {
      claim_id: claimId,
      log_type: ClaimLogType.INSPECTION_COMPLETED,
      message: `Inspection completed`,
      details: { inspection: inspectionData },
    },
    options
  );
};

// Create a log for estimate creation
export const logEstimateCreated = (
  claimId: string,
  estimateData: any,
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return createLog(
    {
      claim_id: claimId,
      log_type: ClaimLogType.ESTIMATE_CREATED,
      message: `Estimate created with total amount ${estimateData.total_amount}`,
      details: { estimate: estimateData },
    },
    options
  );
};

// Create a log for additional creation
export const logAdditionalCreated = (
  claimId: string,
  additionalData: any,
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return createLog(
    {
      claim_id: claimId,
      log_type: ClaimLogType.ADDITIONAL_CREATED,
      message: `Additional line item created`,
      details: { additional: additionalData },
    },
    options
  );
};

// Create a manual log entry
export const logManualEntry = (
  claimId: string,
  message: string,
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return createLog(
    {
      claim_id: claimId,
      log_type: ClaimLogType.MANUAL_LOG,
      message,
    },
    options
  );
};
