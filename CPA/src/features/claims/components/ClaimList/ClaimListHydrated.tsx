'use client';

import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/trpc/react';
import { QUERY_KEYS, CACHE_TIMES } from '@/lib/api/constants';
import { ClaimListSkeleton } from './ClaimListSkeleton';
import { ClaimListError } from './ClaimListError';
import { ClaimListEmpty } from './ClaimListEmpty';
import { ClaimListItems } from './ClaimListItems';

export interface ClaimListHydratedProps {
  suspense?: boolean;
}

export function ClaimListHydrated({ suspense = false }: ClaimListHydratedProps) {
  const queryClient = useQueryClient();
  
  // Use the tRPC hook with initialData from the query client
  const { 
    data: claims = [], 
    isLoading, 
    isError, 
    error,
    status 
  } = api.claim.getAll.useQuery(
    undefined,
    {
      // Use the data that was prefetched on the server
      initialData: queryClient.getQueryData(QUERY_KEYS.CLAIMS.ALL),
      staleTime: CACHE_TIMES.MEDIUM,
      suspense, // Use the suspense prop to control whether this query should suspend
    }
  );

  // When using suspense mode, we only need to handle error and empty states
  if (suspense) {
    if (isError) {
      return <ClaimListError message={error?.message} />;
    }
    
    if (claims.length === 0) {
      return <ClaimListEmpty />;
    }
    
    return <ClaimListItems claims={claims} />;
  }
  
  // When not using suspense mode, we need to handle loading state as well
  if (isLoading) {
    return <ClaimListSkeleton />;
  }
  
  if (isError) {
    return <ClaimListError message={error?.message} />;
  }
  
  if (claims.length === 0) {
    return <ClaimListEmpty />;
  }
  
  return <ClaimListItems claims={claims} />;
}
