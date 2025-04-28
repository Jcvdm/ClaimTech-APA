
import React, { useState } from "react";
import { QueryClientProvider, HydrationBoundary } from "@tanstack/react-query";
import { createQueryClient } from "@/trpc/query-client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Suspense } from "react";
import { ClaimListSkeleton } from "@/features/claims/components/ClaimList/ClaimListSkeleton";
import Claims from "@/features/claims/components/Claims";

export default function ClientClaimsPage({ state }: { state: unknown }) {
  const [qc] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={qc}>
      <HydrationBoundary state={state}>
        <ErrorBoundary fallback={
          <div className="p-4 border border-destructive rounded-md bg-destructive/10">
            <h3 className="font-semibold text-destructive">Failed to load claims</h3>
            <p className="text-sm text-destructive/80">There was an error loading the claims data. Please try again later.</p>
          </div>
        }>
          <Suspense fallback={<ClaimListSkeleton />}>
            <Claims />
          </Suspense>
        </ErrorBoundary>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
