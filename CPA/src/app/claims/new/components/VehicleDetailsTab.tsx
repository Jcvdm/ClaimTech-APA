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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface VehicleDetailsTabProps {
  form: UseFormReturn<FormValues>;
  isSubmitting: boolean;
  goToNextTab: () => void;
  goToPreviousTab: () => void;
}

export function VehicleDetailsTab({
  form,
  isSubmitting,
  goToNextTab,
  goToPreviousTab
}: VehicleDetailsTabProps) {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-6 pb-2 border-b">Vehicle Details</h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 md:items-start">
          {/* Make */}
          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Make</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter vehicle make"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  The manufacturer of the vehicle
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Model */}
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter vehicle model"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  The model of the vehicle
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Year */}
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter vehicle year"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                      field.onChange(value);
                    }}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  The manufacturing year of the vehicle
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Color */}
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter vehicle color"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  The color of the vehicle
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Registration Number */}
          <FormField
            control={form.control}
            name="registration_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter registration number"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  The license plate number of the vehicle
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* VIN */}
          <FormField
            control={form.control}
            name="vin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VIN</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter vehicle identification number"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Vehicle Identification Number
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Engine Number */}
          <FormField
            control={form.control}
            name="engine_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Engine Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter engine number"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  The engine serial number
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Note about inspection details */}
          <div className="col-span-2 mt-2 p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              Additional vehicle details such as transmission type, drive type, fuel type, license disk information, lettering, and trim mouldings will be captured during the vehicle inspection process.
            </p>
          </div>

          {/* Vehicle Identifier Warning */}
          <div className="col-span-2 mt-2">
            <p className="text-sm text-muted-foreground">
              Note: At least one vehicle identifier (Registration Number, VIN, or Engine Number) is required.
            </p>
          </div>
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
