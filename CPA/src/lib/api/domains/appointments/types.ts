// src/lib/api/domains/appointments/types.ts
import { type RouterOutputs, type RouterInputs } from "@/lib/api/types";

// Define types
export type Appointment = RouterOutputs["appointment"]["getByClaim"][number];
export type AppointmentCreateInput = RouterInputs["appointment"]["create"];
export type AppointmentUpdateInput = RouterInputs["appointment"]["update"];
export type AppointmentStatusUpdateInput = RouterInputs["appointment"]["updateStatus"];

// Define appointment status enum
export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  NO_SHOW = 'no_show'
}

// Define appointment status options for UI
export const AppointmentStatusOptions = [
  { value: AppointmentStatus.PENDING, label: "Pending" },
  { value: AppointmentStatus.CONFIRMED, label: "Confirmed" },
  { value: AppointmentStatus.COMPLETED, label: "Completed" },
  { value: AppointmentStatus.CANCELLED, label: "Cancelled" },
  { value: AppointmentStatus.RESCHEDULED, label: "Rescheduled" },
  { value: AppointmentStatus.NO_SHOW, label: "No Show" }
];

// Define location type enum values
export const LocationTypeOptions = [
  { value: "client", label: "Client" },
  { value: "tow yard", label: "Tow Yard" },
  { value: "workshop", label: "Workshop" }
];
