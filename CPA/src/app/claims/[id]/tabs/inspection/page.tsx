import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/api/query-client";
import { prefetchClaimServer } from "@/lib/api/domains/claims/server-prefetch.server";
import { prefetchInspectionsByClaimServer } from "@/lib/api/domains/inspections/server-prefetch.server";
import InspectionTab from "./InspectionTab";

interface InspectionTabPageProps {
  params: {
    id: string;
  };
}

export default async function InspectionTabPage({ params }: InspectionTabPageProps) {
  const queryClient = getQueryClient();

  try {
    // Prefetch claim data
    const claimData = await prefetchClaimServer(params.id);

    if (!claimData.details && !claimData.summary) {
      console.error(`[InspectionTabPage] No claim data found for ${params.id}, returning 404.`);
      notFound();
    }

    // Prefetch inspections data
    const inspectionsData = await prefetchInspectionsByClaimServer(params.id);
    console.log(`[InspectionTabPage] Prefetched ${inspectionsData.length} inspections for claim ${params.id}`);

    // Dehydrate the query client to pass the prefetched data to the client
    const dehydratedState = dehydrate(queryClient);

    return (
      <HydrationBoundary state={dehydratedState}>
        <InspectionTab inspectionsData={inspectionsData} />
      </HydrationBoundary>
    );
  } catch (error) {
    console.error(`[InspectionTabPage] Error prefetching data:`, error);
    notFound();
  }
}
