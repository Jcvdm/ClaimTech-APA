import { FormLoadingSkeleton } from "@/components/ui/loading-states";

export default function Loading() {
  return <FormLoadingSkeleton sections={1} fieldsPerSection={4} />;
}
