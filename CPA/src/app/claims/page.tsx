import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { ClientClaims } from "./client-claims";
import { getQueryClient } from "@/trpc/query-client";
import { api } from "@/trpc/server";
import { QUERY_KEYS, CACHE_TIMES } from "@/lib/api/constants";
import { prefetchClaimsListServer } from "@/lib/api/domains/claims/server-prefetch.server";

export const metadata: Metadata = {
  title: "Claims Management",
  description: "View and manage all claims in the system.",
};

// Loading component
function ClaimsLoading() {
  return (
    <div className="p-4 border border-gray-200 bg-gray-50 rounded-md">
      <h3 className="text-lg font-medium text-gray-800">Loading claims...</h3>
      <p className="text-sm text-gray-600">
        Please wait while we load the claims data.
      </p>
    </div>
  );
}

export default async function ClaimsPage() {
  // Get the query client
  const queryClient = getQueryClient();

  // Log the start of prefetching
  console.log("[ClaimsPage] Starting server-side prefetch for claims list");

  try {
    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log("[ClaimsPage] Timeout reached, using fallback prefetching");
        resolve();
      }, 8000); // 8 second timeout
    });

    // Use our new prefetchClaimsListServer function to prefetch all claims data
    // This will prefetch the claims list and all related data for expandable rows
    const params = {
      filter: 'active',
      page: 1,
      limit: 10,
      search: "",
      sortBy: "created_at",
      sortOrder: "desc"
    };

    // Race the prefetch against the timeout
    await Promise.race([
      prefetchClaimsListServer(params),
      timeoutPromise
    ]);

    console.log("[ClaimsPage] Successfully prefetched claims list with all related data");
  } catch (error) {
    console.error("[ClaimsPage] Error prefetching claims list:", error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`[ClaimsPage] Error message: ${error.message}`);
      console.error(`[ClaimsPage] Error stack: ${error.stack}`);
    }

    // Fallback to basic prefetching if the advanced prefetch fails
    console.log("[ClaimsPage] Falling back to basic prefetching");

    try {
      await queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.CLAIMS.ALL,
        queryFn: () => api.claim.getAll.query(),
        staleTime: CACHE_TIMES.MEDIUM,
      });
    } catch (fallbackError) {
      console.error("[ClaimsPage] Error in fallback prefetching:", fallbackError);
      // Continue without prefetched data - the client will fetch it
    }
  }

  // Dehydrate the query client safely
  let dehydratedState;
  try {
    dehydratedState = dehydrate(queryClient);
  } catch (dehydrateError) {
    console.error("[ClaimsPage] Error dehydrating query client:", dehydrateError);
    // Create an empty dehydrated state
    dehydratedState = { mutations: [], queries: [] };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Claims</h2>
          <p className="text-muted-foreground">
            Manage and view all claims in the system
          </p>
        </div>
        <Link href="/claims/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Claim
          </Button>
        </Link>
      </div>
      <Suspense fallback={<ClaimsLoading />}>
        <ClientClaims dehydratedState={dehydratedState} />
      </Suspense>
    </div>
  );
}
