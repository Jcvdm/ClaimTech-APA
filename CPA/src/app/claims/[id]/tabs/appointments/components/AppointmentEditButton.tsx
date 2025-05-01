"use client";

import { useState } from 'react';
import { type Appointment } from '@/lib/api/domains/appointments';
import { type ClaimDetails } from '@/lib/api/domains/claims/types';
import { AppointmentForm } from '@/features/appointments/components/AppointmentForm';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface AppointmentEditButtonProps {
  appointment: Appointment;
  claim: ClaimDetails;
  onAppointmentUpdated: () => void;
}

export default function AppointmentEditButton({
  appointment,
  claim,
  onAppointmentUpdated
}: AppointmentEditButtonProps) {
  // Use a separate state for the dialog to ensure it's controlled properly
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="ml-auto"
      >
        <X className="h-4 w-4 mr-2" />
        Edit
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          {isOpen && (
            <AppointmentForm
              claim={claim}
              appointment={appointment}
              mode="edit"
              onSuccess={() => {
                setIsOpen(false);
                onAppointmentUpdated();
              }}
              onCancel={() => setIsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
