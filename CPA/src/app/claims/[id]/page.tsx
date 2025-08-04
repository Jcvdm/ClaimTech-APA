import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { isValidUUID } from "@/lib/utils";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Import the client-side components
import ClaimSessionManagerWrapper from "./ClaimSessionManagerWrapper.client";
import { ClientClaimDetails } from "@/features/claims/components/ClientClaimDetails";

// Server-side prefetch functions
import { prefetchClaimServer } from "@/lib/api/domains/claims/server-prefetch.server";
import { prefetchAppointmentsServer } from "@/lib/api/domains/appointments/server-prefetch.server";
import { prefetchAttachmentsServer } from "@/lib/api/domains/attachments/server-prefetch.server";
import { prefetchVehicleServer } from "@/lib/api/domains/vehicles/server-prefetch.server";
import { prefetchClientServer } from "@/lib/api/domains/clients/server-prefetch.server";
import { prefetchProvincesServer, prefetchLossAdjustersServer } from "@/lib/api/domains/lookups/server-prefetch.server";
import { prefetchInspectionsByClaimServer } from "@/lib/api/domains/inspections/server-prefetch.server";
import { prefetchClaimLogsServer } from "@/lib/api/domains/logs/server-prefetch.server";

// Tab components
import TabContainer from "./TabContainer.client";
import OverviewTab from "./tabs/overview/OverviewTab";
import AppointmentsTab from "./tabs/appointments/AppointmentsTab";
import InspectionTab from "./tabs/inspection/InspectionTab";

import EstimateTab from "./tabs/estimate/EstimateTab";
import PreIncidentTab from "./tabs/preincident/PreIncidentTab";

export default async function ClaimDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Await params to satisfy Next.js requirement
  const { id } = await params;

  // Server-side validation of UUID
  if (!isValidUUID(id)) {
    console.error(`[ClaimDetailsPage] Invalid UUID detected: ${id}, returning 404.`);
    notFound();
  }

  console.log(`[ClaimDetailsPage] Prefetching data for claim ${id}`);

  // Prefetch claim data with all related data in a single call
  const claimData = await prefetchClaimServer(id);

  if (!claimData.details && !claimData.summary) {
    console.error(`[ClaimDetailsPage] No claim data found for ${id}, returning 404.`);
    notFound();
  }

  // Prefetch inspection data and logs
  const [inspectionsData, logsData] = await Promise.all([
    prefetchInspectionsByClaimServer(id),
    prefetchClaimLogsServer(id, 20) // Prefetch logs with a limit of 20
  ]);
  console.log(`[ClaimDetailsPage] Prefetched ${Array.isArray(inspectionsData) ? inspectionsData.length : 0} inspections and ${Array.isArray(logsData) ? logsData.length : 0} logs for claim ${id}`);

  // All related data is now included in the claimData object
  const {
    appointments: appointmentsData,
    attachments: attachmentsData,
    vehicle: vehicleData,
    client: clientData,
    provinces: provincesData,
    lossAdjusters: lossAdjustersData
  } = claimData;

  console.log(`[ClaimDetailsPage] Successfully prefetched all data for claim ${id}`);

  // Prepare all tab contents as server components
  const tabContents = {
    overview: (
      <ErrorBoundary fallback={<div>Error loading overview</div>}>
        <Suspense fallback={<div>Loading overview...</div>}>
          <OverviewTab claimData={claimData as any} />
        </Suspense>
      </ErrorBoundary>
    ),
    appointment: (
      <ErrorBoundary fallback={<div>Error loading appointment</div>}>
        <Suspense fallback={<div>Loading appointment...</div>}>
          <AppointmentsTab appointmentsData={appointmentsData as any} claimData={claimData as any} />
        </Suspense>
      </ErrorBoundary>
    ),
    inspection: (
      <ErrorBoundary fallback={<div>Error loading inspection</div>}>
        <Suspense fallback={<div>Loading inspection...</div>}>
          <InspectionTab inspectionsData={inspectionsData as any} />
        </Suspense>
      </ErrorBoundary>
    ),

    estimate: (
      <ErrorBoundary fallback={<div>Error loading estimate</div>}>
        <Suspense fallback={<div>Loading estimate...</div>}>
          <EstimateTab />
        </Suspense>
      </ErrorBoundary>
    ),
    preincident: (
      <ErrorBoundary fallback={<div>Error loading pre-incident</div>}>
        <Suspense fallback={<div>Loading pre-incident...</div>}>
          <PreIncidentTab />
        </Suspense>
      </ErrorBoundary>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/claims">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            Claim Details: {(claimData as any).details?.job_number || (claimData as any).summary?.job_number}
          </h1>
        </div>
      </div>

      {/* Add the claim session manager */}
      <ClaimSessionManagerWrapper claimId={id} />

      {/* Commenting out for now as we're using TabContainer
      <ErrorBoundary fallback={<div>Error loading claim details</div>}>
        <Suspense fallback={<div>Loading claim details...</div>}>
          <ClientClaimDetails id={id} initialData={claimData} />
        </Suspense>
      </ErrorBoundary>
      */}

      <TabContainer
        id={id}
        tabContents={tabContents}
        initialData={{
          claim: claimData,
          appointments: appointmentsData,
          attachments: attachmentsData,
          vehicle: vehicleData,
          client: clientData,
          inspections: inspectionsData,
          logs: logsData
        } as any}
      />
    </div>
  );
}
