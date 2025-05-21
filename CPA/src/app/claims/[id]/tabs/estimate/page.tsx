import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/api/query-client";
import { prefetchClaimServer } from "@/lib/api/domains/claims/server-prefetch.server";
import { prefetchEstimateByClaimServer } from "@/lib/api/domains/estimates/server-prefetch.server";
import EstimateTab from "./EstimateTab";

interface EstimateTabPageProps {
  params: {
    id: string;
  };
}

export default async function EstimateTabPage({ params }: EstimateTabPageProps) {
  const queryClient = getQueryClient();

  try {
    // Prefetch claim data
    const claimData = await prefetchClaimServer(params.id);

    if (!claimData.details && !claimData.summary) {
      console.error(`[EstimateTabPage] No claim data found for ${params.id}, returning 404.`);
      notFound();
    }

    // Prefetch estimate data
    const estimateData = await prefetchEstimateByClaimServer(params.id);
    console.log(`[EstimateTabPage] Prefetched estimate data for claim ${params.id}`);

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
