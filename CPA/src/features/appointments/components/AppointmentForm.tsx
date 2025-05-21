"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type ClaimDetails } from '@/lib/api/domains/claims/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { CalendarIcon, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useCreateAppointment,
  useUpdateAppointment,
  type Appointment,
  LocationTypeOptions
} from '@/lib/api/domains/appointments';
import { api } from '@/trpc/react';
import { EnhancedSelect } from "@/components/ui/enhanced-select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Define the form schema with Zod
const appointmentFormSchema = z.object({
  appointment_datetime: z.date({
    required_error: "Please select a date and time",
  }),
  appointment_time: z.string({
    required_error: "Please select a time",
  }).regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please use HH:MM format"),
  // Remove appointment_duration_minutes from UI as per requirements
  location_type: z.enum(["client", "tow yard", "workshop"], {
    required_error: "Please select a location type",
  }),
  location_address: z.string().min(5, "Please enter a valid address"),
  appointment_contact_name: z.string().min(2, "Please enter a contact name"),
  appointment_contact_phone: z.string().min(10, "Please enter a valid phone number"),
  special_instructions: z.string().optional(),
  appointment_status: z.string().default("pending"),
});

// Infer the type from the schema
type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  claim: ClaimDetails;
  appointment?: Appointment; // Optional appointment for editing mode
  mode?: 'create' | 'edit'; // Form mode
  onSuccess: () => void;
  onCancel: () => void;
}

export function AppointmentForm({ claim, appointment, mode = 'create', onSuccess, onCancel }: AppointmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate claim object
  if (!claim || typeof claim !== 'object') {
    console.error('Invalid claim object provided to AppointmentForm:', claim);
    setError('Invalid claim data. Please try again or contact support.');
    // We'll continue with empty values and show an error message
  }

  // Initialize mutations
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();

  // Parse appointment datetime and time if in edit mode
  const getInitialDateTime = (): { date: Date, time: string } => {
    if (mode === 'edit' && appointment?.appointment_datetime) {
      const dateObj = new Date(appointment.appointment_datetime);
      return {
        date: dateObj,
        time: format(dateObj, 'HH:mm')
      };
    }
    return {
      date: new Date(),
      time: '09:00'
    };
  };

  const { date: initialDate, time: initialTime } = getInitialDateTime();

  // Set default values using claim data with proper null checking
  const defaultValues: Partial<AppointmentFormValues> = {
    appointment_datetime: initialDate,
    appointment_time: initialTime,
    location_type: mode === 'edit' ? appointment?.location_type as "client" | "tow yard" | "workshop" : "client",
    location_address: mode === 'edit' ? appointment?.location_address || '' : '',
    appointment_contact_name: mode === 'edit' ? appointment?.appointment_contact_name || '' : claim?.insured_name || '',
    appointment_contact_phone: mode === 'edit' ? appointment?.appointment_contact_phone || '' : claim?.insured_contact || '',
    special_instructions: mode === 'edit' ? appointment?.special_instructions || '' : '',
    appointment_status: mode === 'edit' ? appointment?.appointment_status || 'pending' : 'pending',
  };

  // Initialize the form
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues,
  });

  // Log the default values for debugging
  console.log('[AppointmentForm] Default values:', defaultValues);

  // Convert LocationTypeOptions to the format expected by EnhancedSelect
  const enhancedLocationTypeOptions = LocationTypeOptions.map(option => ({
    id: option.value,
    name: option.label
  }));

  // Reset form when appointment changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && appointment) {
      const { date: initialDate, time: initialTime } = getInitialDateTime();

      form.reset({
        appointment_datetime: initialDate,
        appointment_time: initialTime,
        location_type: appointment.location_type as "client" | "tow yard" | "workshop",
        location_address: appointment.location_address || '',
        appointment_contact_name: appointment.appointment_contact_name || '',
        appointment_contact_phone: appointment.appointment_contact_phone || '',
        special_instructions: appointment.special_instructions || '',
        appointment_status: appointment.appointment_status || 'pending',
      });
    }
  }, [appointment, form, mode]);

  // Handle form submission
  const onSubmit = async (data: AppointmentFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate claim object and ID
      if (!claim || !claim.id) {
        throw new Error('Invalid claim data. Missing claim ID.');
      }

      // Combine date and time
      const dateObj = new Date(data.appointment_datetime);
      const [hours, minutes] = data.appointment_time.split(':').map(Number);
      dateObj.setHours(hours, minutes);

      // Log the operation for debugging
      console.log(`[AppointmentForm] ${mode === 'create' ? 'Creating' : 'Updating'} appointment for claim ${claim.id}`);

      if (mode === 'create') {
        // Prepare the appointment data for creation
        const appointmentData = {
          claim_id: claim.id,
          appointment_datetime: dateObj.toISOString(),
          appointment_duration_minutes: 60, // Default value, not shown in UI
          location_type: data.location_type,
          location_address: data.location_address,
          appointment_contact_name: data.appointment_contact_name,
          appointment_contact_phone: data.appointment_contact_phone,
          special_instructions: data.special_instructions || null,
          appointment_status: data.appointment_status,
        };

        // Submit the appointment data
        createAppointment.mutate(appointmentData, {
          onSuccess: (data) => {
            console.log('[AppointmentForm] Appointment created successfully:', data);
            toast.success('Appointment scheduled successfully');

            // Call the success callback to trigger refetching
            onSuccess();
            setIsSubmitting(false);
          },
          onError: (error) => {
            console.error('Error scheduling appointment:', error);
            toast.error(`Failed to schedule appointment: ${error.message}`);
            setError(`Failed to schedule appointment: ${error.message}`);
            setIsSubmitting(false);
          }
        });
      } else if (mode === 'edit' && appointment) {
        // Prepare the appointment data for update
        const appointmentData = {
          id: appointment.id,
          claim_id: claim.id,
          appointment_datetime: dateObj.toISOString(),
          location_type: data.location_type,
          location_address: data.location_address,
          appointment_contact_name: data.appointment_contact_name,
          appointment_contact_phone: data.appointment_contact_phone,
          special_instructions: data.special_instructions || null,
          appointment_status: data.appointment_status,
        };

        // Submit the appointment data
        updateAppointment.mutate(appointmentData, {
          onSuccess: (data) => {
            console.log('[AppointmentForm] Appointment updated successfully:', data);
            toast.success('Appointment updated successfully');

            // Call the success callback to trigger refetching
            onSuccess();
            setIsSubmitting(false);
          },
          onError: (error) => {
            console.error('Error updating appointment:', error);
            toast.error(`Failed to update appointment: ${error.message}`);
            setError(`Failed to update appointment: ${error.message}`);
            setIsSubmitting(false);
          }
        });
      }
    } catch (error) {
      console.error('Error preparing appointment data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process appointment';
      toast.error(errorMessage);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Schedule New Appointment' : 'Edit Appointment'}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Display error message if there's an error */}
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-4 flex items-start">
            <div className="mr-2 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>{error}</div>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Field */}
              <FormField
                control={form.control}
                name="appointment_datetime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
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
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date);
                            }
                          }}
                          disabled={(date) => {
                            // Only disable dates in the past (before today)
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      The date of the appointment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time Field */}
              <FormField
                control={form.control}
                name="appointment_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <div className="grid gap-2">
                      <FormControl>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="time"
                            placeholder="Select time"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </div>
                      </FormControl>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "Morning", value: "09:00" },
                          { label: "Noon", value: "12:00" },
                          { label: "Afternoon", value: "15:00" },
                          { label: "Evening", value: "18:00" },
                        ].map((time) => (
                          <Button
                            key={time.value}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange(time.value)}
                            className={cn(
                              "h-8 text-xs",
                              field.value === time.value && "bg-primary text-primary-foreground"
                            )}
                            disabled={isSubmitting}
                          >
                            {time.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <FormDescription>
                      The time of the appointment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration field removed as per requirements */}

              {/* Location Type Field */}
              <FormField
                control={form.control}
                name="location_type"
                render={({ field }) => (
                  <>
                    <EnhancedSelect
                      name="location_type"
                      label="Location Type"
                      control={form.control}
                      options={enhancedLocationTypeOptions}
                      disabled={isSubmitting}
                      onValueChange={(value) => {
                        console.log(`[AppointmentForm] Location type changed to: ${value}`);
                      }}
                    />
                    <FormDescription className="mt-1">
                      Type of location for the appointment
                    </FormDescription>
                  </>
                )}
              />

              {/* Province Field (Read-only) */}
              <ProvinceDisplay provinceId={claim?.province_id} />

              {/* Location Address Field */}
              <FormField
                control={form.control}
                name="location_address"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the full address"
                        className="resize-none"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Full address where the appointment will take place
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Name Field */}
              <FormField
                control={form.control}
                name="appointment_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter contact name"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Name of the contact person for the appointment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Phone Field */}
              <FormField
                control={form.control}
                name="appointment_contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter contact phone number"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Phone number of the contact person
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Special Instructions Field */}
              <FormField
                control={form.control}
                name="special_instructions"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Special Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any special instructions or notes"
                        className="resize-none"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Any additional instructions for the appointment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? (mode === 'create' ? 'Scheduling...' : 'Updating...')
                  : (mode === 'create' ? 'Schedule Appointment' : 'Update Appointment')
                }
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/**
 * Component to display province information in a read-only field
 */
function ProvinceDisplay({ provinceId }: { provinceId: string | null | undefined }) {
  // Fetch provinces data
  const { data: provinces, isLoading } = api.lookup.getProvinces.useQuery(undefined, {
    staleTime: Infinity,
    retry: 2,
  });

  // Find the province name that matches the provinceId
  const provinceName = React.useMemo(() => {
    if (!provinceId || !provinces || provinces.length === 0) return 'Not specified';

    const province = provinces.find(p => p.id === provinceId);
    return province ? province.name : 'Not specified';
  }, [provinceId, provinces]);

  return (
    <FormItem>
      <FormLabel>Province</FormLabel>
      <div className="flex items-center">
        <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
        <Input
          value={isLoading ? 'Loading province...' : provinceName}
          disabled
          className="bg-muted/50"
        />
      </div>
      <FormDescription>
        Province from the claim (read-only)
      </FormDescription>
    </FormItem>
  );
}
