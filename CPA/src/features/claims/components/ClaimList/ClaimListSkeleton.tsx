'use client';

import { Skeleton } from "@/components/ui/skeleton";

export function ClaimListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[500px] w-full" />
    </div>
  );
}
