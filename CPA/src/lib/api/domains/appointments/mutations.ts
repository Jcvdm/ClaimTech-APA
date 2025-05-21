// src/lib/api/domains/appointments/mutations.ts
import { apiClient } from "@/lib/api/client";
import { type MutationOptions } from "@/lib/api/client";
import { toast } from "sonner";
import {
  type Appointment,
  type AppointmentCreateInput,
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
   * Create a new appointment
   */
  create: (options?: MutationOptions<Appointment, AppointmentCreateInput>) => {
    const queryClient = useQueryClient();

    return apiClient.mutation<Appointment, AppointmentCreateInput>(
      () => apiClient.raw.appointment.create.useMutation(),
      {
        onSuccess: async (data, variables) => {
          toast.success("Appointment scheduled successfully");

          // Log the appointment creation
          try {
            const { logAppointmentCreated } = await import("@/lib/api/domains/logs/mutations");
            await logAppointmentCreated(data.claim_id, data).mutateAsync({} as any);
          } catch (error) {
            console.error("Failed to log appointment creation:", error);
          }

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
          toast.error(`Failed to schedule appointment: ${error.message}`);
          options?.onError?.(error);
        },
        ...options
      }
    );
  },
  /**
   * Update an existing appointment
   */
  update: (options?: MutationOptions<Appointment, AppointmentUpdateInput>) => {
    const queryClient = useQueryClient();

    return apiClient.mutation<Appointment, AppointmentUpdateInput>(
      () => apiClient.raw.appointment.update.useMutation(),
      {
        onMutate: async (variables) => {
          // Store the old appointment data for logging
          const queryKey = ["appointment", variables.id];
          const previousAppointment = apiClient.getQueryData<Appointment>(queryKey);
          return { previousAppointment };
        },
        onSuccess: async (data, variables, context) => {
          toast.success("Appointment updated successfully");

          // Log the appointment update if it's a reschedule
          try {
            const oldAppointment = context?.previousAppointment;
            if (oldAppointment &&
                oldAppointment.appointment_datetime !== data.appointment_datetime) {
              const { logAppointmentRescheduled } = await import("@/lib/api/domains/logs/mutations");
              await logAppointmentRescheduled(
                data.claim_id,
                oldAppointment.appointment_datetime,
                data.appointment_datetime,
                data
              ).mutateAsync({} as any);
            }
          } catch (error) {
            console.error("Failed to log appointment update:", error);
          }

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
        onMutate: async (variables) => {
          // Store the old appointment data for logging
          const queryKey = ["appointment", variables.id];
          const previousAppointment = apiClient.getQueryData<Appointment>(queryKey);
          return { previousAppointment };
        },
        onSuccess: async (data, variables, context) => {
          // Update the appointment in the cache
          queryClient.setQueryData(
            ['appointment', data.id],
            data
          );

          // Invalidate the appointments list for this claim
          queryClient.invalidateQueries({
            queryKey: ['appointment', 'getByClaim', { claim_id: data.claim_id }]
          });

          // Log the appointment status change
          try {
            const { logClaimStatusChanged } = await import("@/lib/api/domains/logs/mutations");
            const oldStatus = context?.previousAppointment?.appointment_status || "Unknown";

            if (variables.appointment_status === AppointmentStatus.CANCELLED) {
              toast.success('Appointment cancelled successfully');
              await logClaimStatusChanged(
                data.claim_id,
                `Appointment: ${oldStatus}`,
                `Appointment: ${AppointmentStatus.CANCELLED}`
              ).mutateAsync({} as any);
            } else if (variables.appointment_status === AppointmentStatus.RESCHEDULED) {
              toast.success('Appointment marked as rescheduled');
              await logClaimStatusChanged(
                data.claim_id,
                `Appointment: ${oldStatus}`,
                `Appointment: ${AppointmentStatus.RESCHEDULED}`
              ).mutateAsync({} as any);
            } else {
              toast.success(`Appointment status updated to ${variables.appointment_status}`);
              await logClaimStatusChanged(
                data.claim_id,
                `Appointment: ${oldStatus}`,
                `Appointment: ${variables.appointment_status}`
              ).mutateAsync({} as any);
            }
          } catch (error) {
            console.error("Failed to log appointment status change:", error);
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
