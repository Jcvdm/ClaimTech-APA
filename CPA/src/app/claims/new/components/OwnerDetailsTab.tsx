import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../schema";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface OwnerDetailsTabProps {
  form: UseFormReturn<FormValues>;
  isSubmitting: boolean;
  goToNextTab: () => void;
  goToPreviousTab: () => void;
}

export function OwnerDetailsTab({
  form,
  isSubmitting,
  goToNextTab,
  goToPreviousTab
}: OwnerDetailsTabProps) {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-6 pb-2 border-b">Owner Details</h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 md:items-start">
          {/* Party Type */}
          <FormField
            control={form.control}
            name="party_type"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Party Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                    disabled={isSubmitting}
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Insured" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Insured
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Third Party" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Third Party
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormDescription>
                  Select whether this is an insured or third party claim
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Insured Name */}
          <FormField
            control={form.control}
            name="insured_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Insured Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter insured name (if different from owner)"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Name of the insured party (if different from owner)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Owner Name */}
          <FormField
            control={form.control}
            name="owner_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter vehicle owner name"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Full name of the vehicle owner
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Owner Contact */}
          <FormField
            control={form.control}
            name="owner_contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner Contact Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter owner's primary contact number"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Primary phone number for the vehicle owner
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Owner Alt Phone */}
          <FormField
            control={form.control}
            name="owner_alt_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alternative Contact Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter alternative contact number (optional)"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Alternative phone number for the vehicle owner
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Owner Email */}
          <FormField
            control={form.control}
            name="owner_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter owner's email address (optional)"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Email address for the vehicle owner
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Owner Address */}
          <FormField
            control={form.control}
            name="owner_address"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Owner Address</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter owner's address (optional)"
                    className="resize-none"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Physical address for the vehicle owner
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
