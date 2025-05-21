import { useQueryState } from "@/lib/api/hooks";
import { getClaimLogs } from "./queries";
import {
  createLog,
  deleteLog,
  logClaimCreated,
  logClaimStatusChanged,
  logAppointmentCreated,
  logAppointmentRescheduled,
  logInspectionStarted,
  logInspectionCompleted,
  logEstimateCreated,
  logAdditionalCreated,
  logManualEntry
} from "./mutations";
import { ClaimLog, ClaimLogCreateInput, ClaimLogsQueryInput, ClaimLogType } from "./types";
import { MutationOptions } from "@/lib/api/types";

/**
 * Hook to fetch logs for a claim
 */
export const useClaimLogs = (input: ClaimLogsQueryInput) => {
  return useQueryState(() => getClaimLogs(input));
};

/**
 * Hook to create a log entry
 */
export const useCreateLog = (
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return createLog({} as ClaimLogCreateInput, options);
};

/**
 * Hook to delete a log entry (admin only)
 */
export const useDeleteLog = (
  options?: MutationOptions<{ success: boolean }, string>
) => {
  return deleteLog("", options);
};

/**
 * Hooks for specific log types
 */

// Hook to log claim creation
export const useLogClaimCreated = (
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return {
    mutateAsync: (claimId: string, claimData: any) =>
      logClaimCreated(claimId, claimData, options).mutateAsync({} as ClaimLogCreateInput)
  };
};

// Hook to log claim status change
export const useLogClaimStatusChanged = (
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return {
    mutateAsync: (claimId: string, oldStatus: string, newStatus: string) =>
      logClaimStatusChanged(claimId, oldStatus, newStatus, options).mutateAsync({} as ClaimLogCreateInput)
  };
};

// Hook to log appointment creation
export const useLogAppointmentCreated = (
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return {
    mutateAsync: (claimId: string, appointmentData: any) =>
      logAppointmentCreated(claimId, appointmentData, options).mutateAsync({} as ClaimLogCreateInput)
  };
};

// Hook to log appointment rescheduling
export const useLogAppointmentRescheduled = (
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return {
    mutateAsync: (claimId: string, oldDate: string, newDate: string, appointmentData: any) =>
      logAppointmentRescheduled(claimId, oldDate, newDate, appointmentData, options).mutateAsync({} as ClaimLogCreateInput)
  };
};

// Hook to log inspection started
export const useLogInspectionStarted = (
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return {
    mutateAsync: (claimId: string, inspectionData: any) =>
      logInspectionStarted(claimId, inspectionData, options).mutateAsync({} as ClaimLogCreateInput)
  };
};

// Hook to log inspection completed
export const useLogInspectionCompleted = (
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return {
    mutateAsync: (claimId: string, inspectionData: any) =>
      logInspectionCompleted(claimId, inspectionData, options).mutateAsync({} as ClaimLogCreateInput)
  };
};

// Hook to log estimate creation
export const useLogEstimateCreated = (
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return {
    mutateAsync: (claimId: string, estimateData: any) =>
      logEstimateCreated(claimId, estimateData, options).mutateAsync({} as ClaimLogCreateInput)
  };
};

// Hook to log additional creation
export const useLogAdditionalCreated = (
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return {
    mutateAsync: (claimId: string, additionalData: any) =>
      logAdditionalCreated(claimId, additionalData, options).mutateAsync({} as ClaimLogCreateInput)
  };
};

// Hook to create a manual log entry
export const useLogManualEntry = (
  options?: MutationOptions<ClaimLog, ClaimLogCreateInput>
) => {
  return {
    mutateAsync: (claimId: string, message: string) =>
      logManualEntry(claimId, message, options).mutateAsync({} as ClaimLogCreateInput)
  };
};
