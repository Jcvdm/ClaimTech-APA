// src/lib/api/domains/appointments/mutations.ts
import { apiClient } from "@/lib/api/client";
import { type MutationOptions } from "@/lib/api/client";
import { toast } from "sonner";
import {
  type Appointment,
  type AppointmentUpdateInput,
  type AppointmentStatusUpdateInput,
  AppointmentStatus
} from "./types";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Mutation functions for appointments
 */
export const appointmentMutations = {
  /**
   * Update an existing appointment
   */
  update: (options?: MutationOptions<Appointment, AppointmentUpdateInput>) => {
    const queryClient = useQueryClient();

    return apiClient.mutation<Appointment, AppointmentUpdateInput>(
      () => apiClient.raw.appointment.update.useMutation(),
      {
        onSuccess: (data, variables) => {
          toast.success("Appointment updated successfully");

          // Update the appointment in the cache
          queryClient.setQueryData(
            ['appointment', data.id],
            data
          );

          // Invalidate the appointments list for this claim
          queryClient.invalidateQueries({
            queryKey: ['appointment', 'getByClaim', { claim_id: data.claim_id }]
          });

          options?.onSuccess?.(data, variables);
        },
        onError: (error) => {
          toast.error(`Failed to update appointment: ${error.message}`);
          options?.onError?.(error);
        },
        ...options
      }
    );
  },

  /**
   * Update just the status of an appointment
   */
  updateStatus: (options?: MutationOptions<Appointment, AppointmentStatusUpdateInput>) => {
    const queryClient = useQueryClient();

    return apiClient.mutation<Appointment, AppointmentStatusUpdateInput>(
      () => apiClient.raw.appointment.updateStatus.useMutation(),
      {
        onSuccess: (data, variables) => {
          // Update the appointment in the cache
          queryClient.setQueryData(
            ['appointment', data.id],
            data
          );

          // Invalidate the appointments list for this claim
          queryClient.invalidateQueries({
            queryKey: ['appointment', 'getByClaim', { claim_id: data.claim_id }]
          });

          // Show appropriate success toast based on the status
          if (variables.appointment_status === AppointmentStatus.CANCELLED) {
            toast.success('Appointment cancelled successfully');
          } else if (variables.appointment_status === AppointmentStatus.RESCHEDULED) {
            toast.success('Appointment marked as rescheduled');
          } else {
            toast.success(`Appointment status updated to ${variables.appointment_status}`);
          }

          options?.onSuccess?.(data, variables);
        },
        onError: (error) => {
          toast.error(`Failed to update appointment status: ${error.message}`);
          options?.onError?.(error);
        },
        ...options
      }
    );
  }
};
