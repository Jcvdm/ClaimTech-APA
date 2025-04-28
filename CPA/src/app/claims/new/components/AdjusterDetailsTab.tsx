import type { UseFormReturn } from "react-hook-form"; // Changed to type-only import
import type { FormValues } from "../schema"; // Changed to type-only import
import { Button } from "@/components/ui/button";
// import { useLossAdjusters } from "@/lib/api/domains/lookups/hooks"; // Remove custom hook
import { api } from "@/trpc/react"; // Import direct API
import type { LossAdjuster } from "@/lib/api/domains/lookups/types"; // Added type import
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AdjusterDetailsTabProps {
  form: UseFormReturn<FormValues>;
  isSubmitting: boolean;
  goToPreviousTab: () => void;
}

export function AdjusterDetailsTab({
  form,
  isSubmitting,
  goToPreviousTab
}: AdjusterDetailsTabProps) {
  // Use direct tRPC hook
  const {
    data: adjusters,
    isLoading,
    isError
  } = api.lookup.getLossAdjusters.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 min
    retry: 2
  });

  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-6 pb-2 border-b">Adjuster Details</h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 md:items-start">
          {/* Assigned Loss Adjuster */}
          <FormField
            control={form.control}
            name="assigned_to_employee_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Loss Adjuster</FormLabel>
                <Select
                  disabled={isLoading || isError || isSubmitting}
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select loss adjuster" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading adjusters...
                      </SelectItem>
                    ) : isError ? (
                      <SelectItem value="error" disabled>
                        Error loading adjusters
                      </SelectItem>
                    ) : (
                      // Render options if data is available
                      adjusters?.map((adjuster: LossAdjuster) => (
                        <SelectItem key={adjuster.id} value={adjuster.id}>
                          {adjuster.full_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The loss adjuster assigned to this claim
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Client Special Instructions */}
          <FormField
            control={form.control}
            name="client_special_instructions"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Special Instructions</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter any special instructions for this claim"
                    className="resize-none"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Any special instructions or notes for this claim
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Policy Number */}
          <FormField
            control={form.control}
            name="policy_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Policy Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter policy number (optional)"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  The insurance policy number related to this claim
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


        </div>
        <div className="flex justify-between space-x-4 mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousTab}
            disabled={isSubmitting}
          >
            Previous
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Claim"}
          </Button>
        </div>
      </div>
    </>
  );
}
