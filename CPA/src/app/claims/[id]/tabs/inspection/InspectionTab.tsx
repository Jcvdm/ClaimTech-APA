import { Suspense } from "react";
import InspectionTabContent from "./InspectionTabContent";
import { Skeleton } from "@/components/ui/skeleton";
import { type Inspection } from "@/lib/api/domains/inspections/types";

interface InspectionTabProps {
  inspectionsData?: Inspection[];
}

export default function InspectionTab({ inspectionsData = [] }: InspectionTabProps) {
  return (
    <Suspense fallback={<InspectionTabSkeleton />}>
      <InspectionTabContent inspectionsData={inspectionsData} />
    </Suspense>
  );
}

function InspectionTabSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-md" />
      <Skeleton className="h-48 w-full rounded-md" />
      <Skeleton className="h-64 w-full rounded-md" />
      <Skeleton className="h-64 w-full rounded-md" />
      <Skeleton className="h-64 w-full rounded-md" />
      <Skeleton className="h-64 w-full rounded-md" />
    </div>
  );
}
