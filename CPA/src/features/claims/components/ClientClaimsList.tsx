"use client";

import { type ClaimWithRelations } from "@/lib/api/domains/claims/types";
import { ClaimList } from "./ClaimList";
import { useClaimsData } from "../hooks/useClaimsData";
import { ClaimListSkeleton } from "./ClaimList/ClaimListSkeleton";
import { ClaimListError } from "./ClaimList/ClaimListError";
import { ClaimListEmpty } from "./ClaimList/ClaimListEmpty";

interface ClientClaimsListProps {
  initialData?: ClaimWithRelations[];
}

export function ClientClaimsList({ initialData }: ClientClaimsListProps) {
  // Use the custom hook to fetch claims data
  const { claims, isLoading, isError, error } = useClaimsData(initialData);

  if (isLoading) {
    return <ClaimListSkeleton />;
  }

  if (isError) {
    return <ClaimListError message={error?.message} />;
  }

  if (claims.length === 0) {
    return <ClaimListEmpty />;
  }

  return <ClaimList initialData={claims} />;
}
