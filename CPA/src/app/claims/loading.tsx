import { TableLoadingSkeleton } from "@/components/ui/loading-states";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <ClaimListSkeleton />;
}

export function ClaimListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <TableLoadingSkeleton rows={10} />
    </div>
  );
}
