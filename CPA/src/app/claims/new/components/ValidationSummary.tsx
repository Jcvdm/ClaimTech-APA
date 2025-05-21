'use client';

import { useFormState } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ValidationSummaryProps {
  form: any;
}

export function ValidationSummary({ form }: ValidationSummaryProps) {
  const { errors, isSubmitted, isDirty } = form.formState;

  // Count total errors
  const errorCount = Object.keys(errors).length;

  // Only show errors if the form has been submitted and there are errors
  if (errorCount === 0 || !isSubmitted) {
    return null;
  }

  // Get unique error messages
  const uniqueErrorMessages = new Set<string>();

  Object.values(errors).forEach((error: any) => {
    if (error?.message) {
      uniqueErrorMessages.add(error.message);
    }
  });

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Required Information Missing</AlertTitle>
      <AlertDescription>
        <p className="mb-2">Please complete the following required fields:</p>
        <ul className="list-disc pl-5">
          {Array.from(uniqueErrorMessages).map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
