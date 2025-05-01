import { type Appointment } from "@/lib/api/domains/appointments";
import { type ClaimDetails } from "@/lib/api/domains/claims/types";
import { Suspense } from "react";
import AppointmentsTabClient from "./components/AppointmentsTabClient";
import AppointmentTabSkeleton from "./components/AppointmentTabSkeleton";
import { prefetchAppointmentsServer } from "@/lib/api/domains/appointments/server-prefetch.server";

interface AppointmentsTabProps {
  appointmentsData?: Appointment[] | null;
  claimData?: { details?: ClaimDetails; summary?: any } | null;
}

export default function AppointmentsTab({ appointmentsData, claimData }: AppointmentsTabProps) {
  // Get claim details from the data with proper null checking
  const claim = claimData?.details;

  // Log the data being passed to the client component
  if (claim?.id) {
    console.log(`[AppointmentsTab] Rendering tab for claim ${claim.id} with ${appointmentsData?.length || 0} appointments`);
  }

  return (
    <Suspense fallback={<AppointmentTabSkeleton />}>
      {/* Pass data to the client component */}
      <AppointmentsTabClient
        appointmentsData={appointmentsData}
        claim={claim}
      />
    </Suspense>
  );
}
