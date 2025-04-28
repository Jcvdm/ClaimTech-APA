import { type Appointment } from "@/lib/api/domains/appointments";
import { type ClaimDetails } from "@/lib/api/domains/claims/types";
import { Suspense } from "react";
import AppointmentsTabClient from "./components/AppointmentsTabClient";
import AppointmentTabSkeleton from "./components/AppointmentTabSkeleton";

interface AppointmentsTabProps {
  appointmentsData?: Appointment[] | null;
  claimData?: { details?: ClaimDetails; summary?: any } | null;
}

export default function AppointmentsTab({ appointmentsData, claimData }: AppointmentsTabProps) {
  // Get claim details from the data with proper null checking
  const claim = claimData?.details;

  return (
    <Suspense fallback={<AppointmentTabSkeleton />}>
      {/* Pass data to the client component without passing any event handlers */}
      <AppointmentsTabClient
        appointmentsData={appointmentsData}
        claim={claim}
      />
    </Suspense>
  );
}
