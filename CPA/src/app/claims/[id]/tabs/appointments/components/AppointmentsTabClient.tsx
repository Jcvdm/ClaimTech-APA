"use client";

import { useState } from 'react';
import { type Appointment } from "@/lib/api/domains/appointments";
import { type ClaimDetails } from "@/lib/api/domains/claims/types";
import { formatDate, formatTime } from "@/lib/utils";
import { CalendarIcon, MapPinIcon, ClockIcon, UserIcon, PhoneIcon, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AppointmentFormWrapper from "./AppointmentFormWrapper.client";

interface AppointmentsTabClientProps {
  appointmentsData?: Appointment[] | null;
  claim?: ClaimDetails | null;
}

export default function AppointmentsTabClient({ 
  appointmentsData, 
  claim 
}: AppointmentsTabClientProps) {
  // Local state for appointments (could be updated after creating a new appointment)
  const [appointments, setAppointments] = useState<Appointment[] | null | undefined>(appointmentsData);
  
  // Check if we have valid data
  const hasValidClaimData = !!claim && !!claim.id;
  const hasAppointments = Array.isArray(appointments) && appointments.length > 0;

  // Handle appointment creation - this function is now defined in the client component
  const handleAppointmentCreated = () => {
    // In a real implementation, this would trigger a refetch or update of the appointments data
    console.log("Appointment created, would refetch data");
    
    // For now, we're just logging. In a real app, you would fetch updated data here
    // For example:
    // fetchAppointments(claim?.id).then(newAppointments => {
    //   setAppointments(newAppointments);
    // });
  };

  // If there's an error with the claim data, show an error message
  if (!hasValidClaimData) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was a problem loading the claim data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Appointment Form Wrapper - Now we can safely pass the event handler */}
      <AppointmentFormWrapper 
        claim={claim} 
        onAppointmentCreated={handleAppointmentCreated} 
      />

      {/* Appointments List */}
      {!hasAppointments ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Appointments</h2>
          <p className="text-muted-foreground">No appointments scheduled</p>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Appointments</h2>
          
          <div className="space-y-4">
            {appointments
              .sort((a, b) => {
                // Safely handle null appointment_datetime
                const dateA = a.appointment_datetime ? new Date(a.appointment_datetime).getTime() : 0;
                const dateB = b.appointment_datetime ? new Date(b.appointment_datetime).getTime() : 0;
                return dateB - dateA;
              })
              .map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  // Validate appointment object
  if (!appointment || typeof appointment !== 'object') {
    console.error('Invalid appointment object:', appointment);
    return (
      <Card>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Invalid appointment data</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Function to get status badge color
  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-amber-100 text-amber-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Safely format date and time
  const formatDateSafe = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    try {
      return formatDate(new Date(dateString));
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const formatTimeSafe = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    try {
      return formatTime(new Date(dateString));
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid time';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            {appointment.location_type || 'Unknown'} Appointment
          </CardTitle>
          <Badge className={getStatusColor(appointment.appointment_status)}>
            {appointment.appointment_status || 'Unknown'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date</p>
              <p>{formatDateSafe(appointment.appointment_datetime)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Time</p>
              <p>{formatTimeSafe(appointment.appointment_datetime)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Location</p>
              <p>{appointment.location_address || 'Not specified'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Duration</p>
              <p>{appointment.appointment_duration_minutes ? `${appointment.appointment_duration_minutes} minutes` : 'Not specified'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact</p>
              <p>{appointment.appointment_contact_name || 'Not specified'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PhoneIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p>{appointment.appointment_contact_phone || 'Not specified'}</p>
            </div>
          </div>
        </div>

        {appointment.special_instructions && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Special Instructions</p>
            <p className="text-sm whitespace-pre-wrap">{appointment.special_instructions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
