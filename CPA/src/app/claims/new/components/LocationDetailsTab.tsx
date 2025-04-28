import { type UseFormReturn } from "react-hook-form";
import { type FormValues } from "../schema";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
// import { useProvinces } from "@/lib/api/domains/lookups"; // Remove custom hook import
import { api } from "@/trpc/react"; // Import the direct tRPC API

interface LocationDetailsTabProps {
  form: UseFormReturn<FormValues>;
  isSubmitting: boolean;
  goToNextTab: () => void;
  goToPreviousTab: () => void;
}

export function LocationDetailsTab({
  form,
  isSubmitting,
  goToNextTab,
  goToPreviousTab
}: LocationDetailsTabProps) {
  // Use the tRPC hook directly instead of the custom hook
  const { data: provinces, isLoading, isError } = api.lookup.getProvinces.useQuery(undefined, {
    staleTime: Infinity,
    retry: 2,
  });

  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-6 pb-2 border-b">Location Details</h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 md:items-start">
          {/* Claim Location */}
          <FormField
            control={form.control}
            name="claim_location"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Claim Location</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter the location where the incident occurred"
                    className="resize-none"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Detailed description of where the incident occurred
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Province */}
          <FormField
            control={form.control}
            name="province_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Province</FormLabel>
                <Select
                  disabled={isLoading || isError || isSubmitting}
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading provinces...
                      </SelectItem>
                    ) : isError ? (
                      <SelectItem value="error" disabled>
                        Error loading provinces
                      </SelectItem>
                    ) : (
                      // Render options if data is available
                      provinces?.map((province: { id: string; name: string }) => (
                        <SelectItem key={province.id} value={province.id}>
                          {province.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The province where the incident occurred
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
            type="button"
            onClick={goToNextTab}
            disabled={isSubmitting}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
