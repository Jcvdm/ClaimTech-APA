import type { UseFormReturn } from "react-hook-form"; // Added 'type'
import type { FormValues } from "../schema"; // Added 'type'
// import { ApiStatus } from "@/lib/api/types"; // Remove ApiStatus import
import { api } from "@/trpc/react"; // Import direct api
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ClaimInstruction } from "@/lib/api/domains/claims";
import { useRouter } from "next/navigation";

interface ClaimInfoTabProps {
  form: UseFormReturn<FormValues>;
  isSubmitting: boolean;
  goToNextTab: () => void;
}

export function ClaimInfoTab({
  form,
  // clients, // Removed prop
  // clientsStatus, // Removed prop
  isSubmitting,
  // provinces, // Removed prop
  // isLoadingProvinces, // Removed prop
  goToNextTab,
}: ClaimInfoTabProps) {
  const router = useRouter();

  // Use tRPC hooks directly
  const {
    data: clients,
    isLoading: isLoadingClients,
    isError: isErrorClients
  } = api.client.getAll.useQuery(undefined, {
    staleTime: Infinity,
    retry: 2
  });

  const {
    data: provinces,
    isLoading: isLoadingProvinces,
    isError: isErrorProvinces
  } = api.lookup.getProvinces.useQuery(undefined, {
    staleTime: Infinity,
    retry: 2
  });

  return (
    <>
      {/* Claim Information Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-6 pb-2 border-b">Claim Information</h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 md:items-start">
          {/* Client Selection */}
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select
                  disabled={isLoadingClients || isErrorClients || isSubmitting}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingClients ? (
                      <SelectItem value="loading" disabled>
                        Loading clients...
                      </SelectItem>
                    ) : isErrorClients ? (
                      <SelectItem value="error" disabled>
                        Error loading clients
                      </SelectItem>
                    ) : (
                      // Render options if data is available
                      clients?.map((client: { id: string, name: string }) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Note about auto-generated job numbers */}
          <div className="col-span-2">
            <p className="text-sm text-muted-foreground">
              Note: Job numbers are automatically generated based on client code and a sequential counter.
            </p>
          </div>

          {/* Client Reference */}
          <FormField
            control={form.control}
            name="client_reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Reference</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter client reference (optional)"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  The client's reference or claim number
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Instruction Type */}
          <FormField
            control={form.control}
            name="instruction"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Instruction Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(value as ClaimInstruction)}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                    disabled={isSubmitting}
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value={ClaimInstruction.AGREE_ONLY} />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Agree Only
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value={ClaimInstruction.AGREE_AND_AUTHORIZE} />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Agree and Authorize
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormDescription>
                  Select the type of instruction for this claim
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date of Loss */}
          <FormField
            control={form.control}
            name="date_of_loss"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Loss</FormLabel>
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
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  The date when the loss/damage occurred
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Time of Loss */}
          <FormField
            control={form.control}
            name="time_of_loss"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time of Loss</FormLabel>
                <div className="grid gap-2">
                  <FormControl>
                    <Input
                      type="time"
                      placeholder="Enter time of loss"
                      {...field}
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </FormControl>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Morning", value: "08:00" },
                      { label: "Noon", value: "12:00" },
                      { label: "Afternoon", value: "15:00" },
                      { label: "Evening", value: "18:00" },
                      { label: "Night", value: "22:00" },
                    ].map((time) => (
                      <Button
                        key={time.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.onChange(time.value)}
                        className={cn(
                          "h-8 text-xs",
                          field.value === time.value && "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        disabled={isSubmitting}
                      >
                        {time.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <FormDescription>
                  The approximate time when the loss/damage occurred
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Accident Description */}
          <FormField
            control={form.control}
            name="accident_description"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Damage Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter a description of the damage"
                    className="resize-none"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Provide details about the damage to the vehicle
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Type of Loss */}
          <FormField
            control={form.control}
            name="type_of_loss"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type of Loss</FormLabel>
                <Select
                  disabled={isSubmitting}
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type of loss" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Accident">Accident</SelectItem>
                    <SelectItem value="Theft">Theft</SelectItem>
                    <SelectItem value="Fire">Fire</SelectItem>
                    <SelectItem value="Flood">Flood</SelectItem>
                    <SelectItem value="Hail">Hail</SelectItem>
                    <SelectItem value="Vandalism">Vandalism</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  The type of incident that caused the loss
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>
      </div>



      {/* Claims Handler Information Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-6 pb-2 border-b">Claims Handler Information</h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 md:items-start">
          {/* Claims Handler Name */}
          <FormField
            control={form.control}
            name="claims_handler_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Claims Handler Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter claims handler name"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  The name of the claims handler at the client
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Claims Handler Contact */}
          <FormField
            control={form.control}
            name="claims_handler_contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Claims Handler Contact</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter claims handler contact number"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Contact number for the claims handler
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Claims Handler Email */}
          <FormField
            control={form.control}
            name="claims_handler_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Claims Handler Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter claims handler email"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Email address for the claims handler
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="flex justify-between space-x-4 mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/claims")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={goToNextTab}
          disabled={isSubmitting}
        >
          Next
        </Button>
      </div>
    </>
  );
}
