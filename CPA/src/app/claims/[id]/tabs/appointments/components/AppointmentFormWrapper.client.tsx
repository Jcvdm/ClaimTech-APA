"use client";

import { useState, useEffect } from 'react';
import { AppointmentForm } from '@/features/appointments/components/AppointmentForm';
import { Button } from '@/components/ui/button';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { type ClaimDetails } from '@/lib/api/domains/claims/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Appointment } from '@/lib/api/domains/appointments';
import { useQueryClient } from '@tanstack/react-query';

interface AppointmentFormWrapperProps {
  claim: ClaimDetails | undefined | null;
  onAppointmentCreated: () => void;
  appointment?: Appointment; // Optional appointment for editing mode
  mode?: 'create' | 'edit'; // Form mode
  isDialog?: boolean; // Whether to show in a dialog (for edit mode)
}

export default function AppointmentFormWrapper({
  claim,
  onAppointmentCreated,
  appointment,
  mode = 'create',
  isDialog = false
}: AppointmentFormWrapperProps) {
  // Only show the form by default if explicitly requested (not on initial tab load)
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Validate claim data when component mounts or claim changes
  useEffect(() => {
    if (!claim) {
      setError('Claim data is not available. Please try refreshing the page.');
    } else if (!claim.id) {
      setError('Invalid claim data. Missing claim ID.');
    } else {
      setError(null);
    }
  }, [claim]);

  const handleSuccess = () => {
    setShowForm(false);

    // Invalidate the appointments query to trigger a refetch
    if (claim?.id) {
      // Invalidate both client-side and tRPC-compatible query keys
      const clientQueryKey = ['appointment', 'getByClaim', { claim_id: claim.id }];
      const trpcQueryKey = ['appointment.getByClaim', { input: { claim_id: claim.id }, type: 'query' }];

      console.log('[AppointmentForm] Invalidating queries:', clientQueryKey, trpcQueryKey);

      // Invalidate the queries
      queryClient.invalidateQueries({ queryKey: clientQueryKey });
      queryClient.invalidateQueries({ queryKey: trpcQueryKey });

      // Also invalidate the claim details to update any appointment-related data there
      queryClient.invalidateQueries({ queryKey: ['claim.getDetails'] });
    }

    // Call the callback
    onAppointmentCreated();
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  // Function to safely check if claim is valid
  const isClaimValid = (): boolean => {
    return !!claim && !!claim.id;
  };

  // If this is a dialog for editing, render the dialog
  if (isDialog) {
    return (
      <>
        {mode === 'edit' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="ml-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Appointment</DialogTitle>
            </DialogHeader>
            {isClaimValid() && appointment && (
              <AppointmentForm
                claim={claim as ClaimDetails}
                appointment={appointment}
                mode="edit"
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Otherwise, render the inline form
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Appointment</h2>
        <Button
          onClick={() => setShowForm(!showForm)}
          disabled={!isClaimValid()}
        >
          {showForm ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Appointment
            </>
          )}
        </Button>
      </div>

      {/* Display error message if there's an error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Only render the form if claim is valid and showForm is true */}
      {showForm && isClaimValid() && (
        <AppointmentForm
          claim={claim as ClaimDetails} // Safe to cast here because we've checked validity
          appointment={appointment}
          mode={mode}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
