import { TabbedFormLoadingSkeleton } from "@/components/ui/loading-states";

export default function Loading() {
  return <TabbedFormLoadingSkeleton sections={2} fieldsPerSection={6} />;
}
