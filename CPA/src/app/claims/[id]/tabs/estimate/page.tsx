import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/api/getQueryClient.server";
import { prefetchClaimServer } from "@/lib/api/domains/claims/server-prefetch.server";
import { prefetchEstimateByClaimServer } from "@/lib/api/domains/estimates/server-prefetch.server";
import EstimateTab from "./EstimateTab";

interface EstimateTabPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EstimateTabPage({ params }: EstimateTabPageProps) {
  const { id } = await params;
  const queryClient = getQueryClient();

  try {
    // Prefetch claim data
    const claimData = await prefetchClaimServer(id);

    if (!claimData.details && !claimData.summary) {
      console.error(`[EstimateTabPage] No claim data found for ${id}, returning 404.`);
      notFound();
    }

    // Prefetch estimate data
    const estimateData = await prefetchEstimateByClaimServer(id);
    console.log(`[EstimateTabPage] Prefetched estimate data for claim ${id}`);

    // Dehydrate the query client to pass the prefetched data to the client
    const dehydratedState = dehydrate(queryClient);

    return (
      <HydrationBoundary state={dehydratedState}>
        <EstimateTab />
      </HydrationBoundary>
    );
  } catch (error) {
    console.error(`[EstimateTabPage] Error prefetching data:`, error);
    notFound();
  }
}
