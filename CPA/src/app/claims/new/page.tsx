import type { Metadata } from "next";
import { Suspense } from "react";
import { NewClaimForm } from "./new-claim-form"; // Import the shared form component
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { prefetchClaimFormData } from "./prefetch.server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/trpc/query-client";

export const metadata: Metadata = {
  title: "New Claim",
  description: "Create a new claim entry.",
};

// This page component prefetches data and renders the form component
export default async function NewClaimPage() {
  try {
    console.log('[NewClaimPage] Starting prefetch for claim form data');

    // Prefetch all data needed for the form
    const prefetchedData = await prefetchClaimFormData();
    console.log('[NewClaimPage] Prefetch complete, setting data in query client');

    // Get a new query client instance
    const queryClient = getQueryClient();

    // Set the prefetched data directly in the query client with the correct query keys
    if (Array.isArray(prefetchedData.clients)) {
      console.log('[NewClaimPage] Setting clients data in query client:', prefetchedData.clients.length);
      queryClient.setQueryData(['trpc', 'client', 'getAll'], prefetchedData.clients);
    } else {
      console.warn('[NewClaimPage] No clients data to set in query client');
      queryClient.setQueryData(['trpc', 'client', 'getAll'], []);
    }

    if (Array.isArray(prefetchedData.provinces)) {
      console.log('[NewClaimPage] Setting provinces data in query client:', prefetchedData.provinces.length);
      console.log('[NewClaimPage] Provinces data:', JSON.stringify(prefetchedData.provinces));

      // Set the data with the correct query key format
      const queryKey = ['trpc', 'lookup', 'getProvinces'];
      queryClient.setQueryData(queryKey, prefetchedData.provinces);

      // Also set with the alternative format
      const alternativeQueryKey = [['trpc', 'lookup', 'getProvinces'], { type: 'query' }];
      queryClient.setQueryData(alternativeQueryKey, prefetchedData.provinces);

      // Check if the data was set correctly
      const queryData = queryClient.getQueryData(queryKey);
      console.log('[NewClaimPage] Provinces data in query client after setting:', queryData);
    } else {
      console.warn('[NewClaimPage] No provinces data to set in query client');
      queryClient.setQueryData(['trpc', 'lookup', 'getProvinces'], []);
      queryClient.setQueryData([['trpc', 'lookup', 'getProvinces'], { type: 'query' }], []);
    }

    if (Array.isArray(prefetchedData.lossAdjusters)) {
      console.log('[NewClaimPage] Setting loss adjusters data in query client:', prefetchedData.lossAdjusters.length);
      queryClient.setQueryData(['trpc', 'lookup', 'getLossAdjusters'], prefetchedData.lossAdjusters);
    } else {
      console.warn('[NewClaimPage] No loss adjusters data to set in query client');
      queryClient.setQueryData(['trpc', 'lookup', 'getLossAdjusters'], []);
    }

    return (
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/claims">Claims</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New Claim</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h2 className="text-3xl font-bold tracking-tight">Create New Claim</h2>

        {/* Render the form with hydrated query client */}
        <HydrationBoundary state={dehydrate(queryClient)}>
          <Suspense fallback={<div>Loading form...</div>}>
            <NewClaimForm />
          </Suspense>
        </HydrationBoundary>
      </div>
    );
  } catch (error) {
    console.error('[New Claim Page] Error rendering page:', error);
    return (
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/claims">Claims</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New Claim</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h2 className="text-3xl font-bold tracking-tight">Create New Claim</h2>

        <div className="p-6 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Form Data</h3>
          <p className="text-red-700">There was an error loading the form data. Please try again later.</p>
        </div>
      </div>
    );
  }
}