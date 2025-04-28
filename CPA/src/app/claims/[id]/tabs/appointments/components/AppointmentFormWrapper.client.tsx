"use client";

import { useState, useEffect } from 'react';
import { AppointmentForm } from '@/features/appointments/components/AppointmentForm';
import { Button } from '@/components/ui/button';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { type ClaimDetails } from '@/lib/api/domains/claims/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AppointmentFormWrapperProps {
  claim: ClaimDetails | undefined | null;
  onAppointmentCreated: () => void;
}

export default function AppointmentFormWrapper({
  claim,
  onAppointmentCreated
}: AppointmentFormWrapperProps) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    onAppointmentCreated();
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  // Function to safely check if claim is valid
  const isClaimValid = (): boolean => {
    return !!claim && !!claim.id;
  };

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
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
