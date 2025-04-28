"use client";

// src/features/claims/components/ClaimList/SummaryContent.tsx
import { type ClaimSummary } from '@/lib/api/domains/claims/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Car, FileText, User } from 'lucide-react';

interface SummaryContentProps {
  summary: ClaimSummary;
}

export function SummaryContent({ summary }: SummaryContentProps) {
  // Helper function to safely format dates
  const formatDate = (dateString: string | null | undefined, formatStr: string = 'dd MMM yyyy') => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), formatStr);
    } catch (error) {
      console.error(`Error formatting date: ${dateString}`, error);
      return 'Invalid date';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div className="space-y-2">
        <div>
          <span className="font-medium">Claim Number:</span> {summary.job_number || 'N/A'}
        </div>
        <div>
          <span className="font-medium">Status:</span> {summary.status || 'N/A'}
        </div>
        <div>
          <span className="font-medium">Client:</span> {summary.client_name || 'N/A'}
        </div>
        <div>
          <span className="font-medium">Claims Handler:</span> {summary.claims_handler_name || 'N/A'}
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <span className="font-medium">Date of Loss:</span> {formatDate(summary.date_of_loss)}
        </div>
        <div>
          <span className="font-medium">Type of Loss:</span> {summary.type_of_loss || 'N/A'}
        </div>
        <div>
          <span className="font-medium">Vehicle:</span>{' '}
          {summary.vehicle_make && summary.vehicle_model
            ? `${summary.vehicle_make} ${summary.vehicle_model} (${summary.vehicle_registration || 'No Reg'})`
            : 'N/A'}
        </div>
        <div>
          <span className="font-medium">Contact:</span>{' '}
          {summary.claims_handler_contact || 'N/A'}
        </div>
      </div>
    </div>
  );
}
