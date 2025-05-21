import { Suspense } from "react";
import { EstimateTabContent } from "./EstimateTabContent";
import { LoadingSpinner } from "@/components/ui/loading-states";

export default function EstimateTab() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EstimateTabContent />
    </Suspense>
  );
}
