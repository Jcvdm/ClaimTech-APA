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

          {/* Transmission Type */}
          <FormField
            control={form.control}
            name="transmission_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transmission Type</FormLabel>
                <Select
                  disabled={isSubmitting}
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select transmission type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Automatic">Automatic</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="CVT">CVT</SelectItem>
                    <SelectItem value="Semi-Automatic">Semi-Automatic</SelectItem>
                    <SelectItem value="Dual-Clutch">Dual-Clutch</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  The type of transmission in the vehicle
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Drive Type */}
          <FormField
            control={form.control}
            name="drive_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Drive Type</FormLabel>
                <Select
                  disabled={isSubmitting}
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select drive type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="FWD">Front-Wheel Drive (FWD)</SelectItem>
                    <SelectItem value="RWD">Rear-Wheel Drive (RWD)</SelectItem>
                    <SelectItem value="AWD">All-Wheel Drive (AWD)</SelectItem>
                    <SelectItem value="4WD">Four-Wheel Drive (4WD)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  The drive configuration of the vehicle
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fuel Type */}
          <FormField
            control={form.control}
            name="fuel_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fuel Type</FormLabel>
                <Select
                  disabled={isSubmitting}
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Petrol">Petrol</SelectItem>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="Electric">Electric</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="Plug-in Hybrid">Plug-in Hybrid</SelectItem>
                    <SelectItem value="LPG">LPG</SelectItem>
                    <SelectItem value="CNG">CNG</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  The type of fuel used by the vehicle
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* License Disk Expiry */}
          <FormField
            control={form.control}
            name="license_disk_expiry"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>License Disk Expiry</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Select date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  The expiry date of the vehicle's license disk
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* License Disk Present */}
          <FormField
            control={form.control}
            name="license_disk_present"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    License Disk Present
                  </FormLabel>
                  <FormDescription>
                    Check if the license disk is present in the vehicle
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* Has Lettering */}
          <FormField
            control={form.control}
            name="has_lettering"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Has Lettering
                  </FormLabel>
                  <FormDescription>
                    Check if the vehicle has lettering or decals
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* Has Trim Mouldings */}
          <FormField
            control={form.control}
            name="has_trim_mouldings"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Has Trim Mouldings
                  </FormLabel>
                  <FormDescription>
                    Check if the vehicle has trim mouldings
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

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
