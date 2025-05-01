"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, X, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  type Appointment,
  useUpdateAppointmentStatus,
  AppointmentStatus
} from '@/lib/api/domains/appointments';
import { type ClaimDetails } from '@/lib/api/domains/claims/types';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AppointmentForm } from '@/features/appointments/components/AppointmentForm';

interface AppointmentActionsProps {
  appointment: Appointment;
  claim: ClaimDetails;
  onAppointmentUpdated: () => void;
}

export default function AppointmentActions({
  appointment,
  claim,
  onAppointmentUpdated
}: AppointmentActionsProps) {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const updateStatus = useUpdateAppointmentStatus();

  // Don't show actions for already cancelled or completed appointments
  if (appointment.appointment_status === AppointmentStatus.CANCELLED ||
      appointment.appointment_status === AppointmentStatus.COMPLETED) {
    return null;
  }

  const handleCancel = () => {
    updateStatus.mutate({
      id: appointment.id,
      claim_id: claim.id,
      appointment_status: AppointmentStatus.CANCELLED,
      reason: cancelReason
    }, {
      onSuccess: () => {
        setIsCancelDialogOpen(false);
        setCancelReason('');
        onAppointmentUpdated();
      }
    });
  };

  const handleRescheduleSuccess = () => {
    // First mark the current appointment as rescheduled
    updateStatus.mutate({
      id: appointment.id,
      claim_id: claim.id,
      appointment_status: AppointmentStatus.RESCHEDULED,
      reason: 'Appointment rescheduled'
    }, {
      onSuccess: () => {
        setIsRescheduleDialogOpen(false);
        onAppointmentUpdated();
      }
    });
  };

  return (
    <div className="flex space-x-2">
      {/* Cancel Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsCancelDialogOpen(true)}
        className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <X className="h-4 w-4 mr-2" />
        Cancel
      </Button>

      {/* Reschedule Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsRescheduleDialogOpen(true)}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Reschedule
      </Button>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Label htmlFor="cancel-reason">Reason for cancellation (optional)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancellation"
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
            >
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for this appointment.
            </DialogDescription>
          </DialogHeader>

          {isRescheduleDialogOpen && (
            <AppointmentForm
              claim={claim}
              appointment={appointment}
              mode="edit"
              onSuccess={handleRescheduleSuccess}
              onCancel={() => setIsRescheduleDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
