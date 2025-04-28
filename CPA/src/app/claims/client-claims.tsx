'use client';

import React, { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useClaimsList, ClaimFilterSchema, type ClaimListParams, type ClaimListItem } from "@/lib/api/domains/claims";
import { type ClaimListResponse } from "@/lib/api/domains/claims/types";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ApiStatus } from "@/lib/api/types";

import { QueryClientProvider, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/trpc/query-client";

export function ClientClaims({ dehydratedState }: { dehydratedState: unknown }) {
  const [qc] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={qc}>
      <HydrationBoundary state={dehydratedState}>
        <ClientClaimsInner />
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

function ClientClaimsInner() {
  const [params, setParams] = useState<ClaimListParams>({
    filter: 'active',
    page: 1,
    limit: 10,
    search: "",
    sortBy: "created_at",
    sortOrder: "desc"
  });

  // Determine filter based on current path
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Update filter when path changes
  useEffect(() => {
    const getFilterFromPath = () => {
      if (pathname === "/claims/additionals") return "additionals";
      if (pathname === "/claims/frc") return "frc";
      if (pathname === "/claims/finalized") return "finalized";
      if (pathname === "/claims/history") return "history";
      return "active"; // Default
    };

    const filter = getFilterFromPath();
    if (ClaimFilterSchema.safeParse(filter).success) {
      setParams(prev => ({ ...prev, filter: filter as any }));
    }
  }, [pathname]);

  // Handle search parameter from URL
  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setParams(prev => ({ ...prev, search, page: 1 }));
    }
  }, [searchParams]);

  // Use the custom hook from our data access layer
  const { data, status, error } = useClaimsList(params);

  // Log data for debugging (optional)
  React.useEffect(() => {
    if (data) {
      try {
        const typedData = data as unknown as ClaimListResponse;
        if (typedData.items?.length > 0) {
          // Log for debugging
          const firstItem = typedData.items[0];
          if (firstItem) {
            console.log("Claims data - first item:", firstItem);
            console.log("Vehicle data:", firstItem.vehicle);
            console.log("Client data:", firstItem.client);
          }
        }
      } catch (error) {
        console.error("Error processing claims data for logging:", error);
      }
    }
  }, [data]);

  // Search is now handled by the DataTable component

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setParams(prev => ({ ...prev, page: newPage }));
  };

  // If loading, show skeleton UI
  if (status === ApiStatus.LOADING) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/4" /> {/* Placeholder for title */}
        <Skeleton className="h-4 w-1/2" /> {/* Placeholder for description */}
        <Skeleton className="h-10 w-full" /> {/* Placeholder for filter */}
        <Skeleton className="h-40 w-full rounded-md border" /> {/* Placeholder for table */}
        <Skeleton className="h-10 w-full" /> {/* Placeholder for pagination */}
      </div>
    );
  }

  // If error, show error message
  if (status === ApiStatus.ERROR) {
    console.error("Error fetching claims:", error?.message);
    return <p className="text-destructive">Error loading claims: {error?.message || "Unknown error"}</p>;
  }

  return (
    <div className="space-y-4">

      {/* Add debugging to see what's being passed to DataTable */}
      {(() => {
        console.log("Data being passed to DataTable:", (data as unknown as ClaimListResponse)?.items);
        return null;
      })()}

      <DataTable<ClaimListItem, any>
        columns={columns}
        data={(data as unknown as ClaimListResponse)?.items || []}
        defaultFilterColumn="job_number"
        excludeFilterColumns={["select", "actions", "vehicles", "registration"]}
        enableExpanding={true}
      />

      {data !== undefined && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(data as unknown as ClaimListResponse)?.items?.length || 0} of {(data as unknown as ClaimListResponse)?.pagination?.total || 0} claims
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(params.page - 1)}
              disabled={params.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {params.page} of {(data as unknown as ClaimListResponse)?.pagination?.pages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(params.page + 1)}
              disabled={params.page >= ((data as unknown as ClaimListResponse)?.pagination?.pages || 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
