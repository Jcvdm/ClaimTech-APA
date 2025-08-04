'use client';

import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { toast } from 'sonner';

interface EstimateErrorBoundaryProps {
  children: React.ReactNode;
}

export function EstimateErrorBoundary({ children }: EstimateErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('[EstimateErrorBoundary] Estimate component error:', error, errorInfo);
    
    // Show immediate user feedback
    toast.error('Estimate component error', {
      description: 'The estimate editor encountered an error. Your data has been preserved.',
      duration: 10000,
    });
  };

  return (
    <ErrorBoundary
      context="Estimate Editor"
      onError={handleError}
      allowRetry={true}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
}