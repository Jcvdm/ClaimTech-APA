"use client";

import { ClaimDetails } from "./ClaimDetails";
import { useClaimDetailsData } from '@/features/claims/hooks/useClaimDetailsData';
import { Skeleton } from "@/components/ui/skeleton";
import { ClaimListError } from "./ClaimList/ClaimListError";

interface ClientClaimDetailsProps {
  id: string;
  initialData?: any; // Optional initial data from server prefetch
}

export function ClientClaimDetails({ id }: { id: string }) {
  const { data: claim, isLoading, error } = useClaimDetailsData(id);

  if (isLoading) return <ClaimDetailsSkeleton />;
  if (error) return <ClaimListError message={error?.message} />;
  if (!claim) return <div>Claim not found</div>;

  // Check if we're using partial data (summary only)
  const isPartialData = 'isPartialData' in claim && claim.isPartialData === true;

  return (
    <>
      {isPartialData && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded">
          <p className="font-bold">Limited Data Available</p>
          <p>Only summary information is available for this claim. Some details may be missing.</p>
        </div>
      )}
      <ClaimDetails {...claim} />
    </>
  );
}

export function ClaimDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
