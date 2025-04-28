"use client";

// src/features/claims/components/ClaimDetails/TabContent/SummaryTab.tsx
import { type ClaimDetails } from '@/lib/api/domains/claims/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit, Printer } from 'lucide-react';
import Link from 'next/link';

interface SummaryTabProps {
  claim: ClaimDetails;
}

export function SummaryTab({ claim }: SummaryTabProps) {
  // Format date of loss
  const formattedDate = claim.date_of_loss
    ? format(new Date(claim.date_of_loss), 'PPP')
    : 'Not specified';

  // Format instructed date (created_at)
  const formattedInstructedDate = claim.instructed_date
    ? format(new Date(claim.instructed_date), 'PPP')
    : 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Claim Summary</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Link href={`/claims/${claim.id}/edit`} passHref>
            <Button size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Claim Information */}
        <Card>
          <CardHeader>
            <CardTitle>Claim Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Job Number</p>
                <p className="font-medium">{claim.job_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge>{claim.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Loss</p>
                <p>{formattedDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time of Loss</p>
                <p>{claim.time_of_loss || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type of Loss</p>
                <p>{claim.type_of_loss || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Instructed Date</p>
                <p>{formattedInstructedDate}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Accident Description</p>
                <p className="whitespace-pre-wrap">{claim.accident_description || 'No description provided'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client & Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client & Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="font-medium">{claim.client_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client Reference</p>
              <p>{claim.client_reference || 'None'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vehicle</p>
              <p>
                {[claim.vehicle_make, claim.vehicle_model].filter(Boolean).join(' ') || 'Unknown'}
                {claim.vehicle_registration && ` (${claim.vehicle_registration})`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Claims Handler</p>
              {claim.claims_handler_name ? (
                <div>
                  <p>{claim.claims_handler_name}</p>
                  {claim.claims_handler_contact && (
                    <p className="text-sm text-muted-foreground">{claim.claims_handler_contact}</p>
                  )}
                  {claim.claims_handler_email && (
                    <p className="text-sm text-muted-foreground">{claim.claims_handler_email}</p>
                  )}
                </div>
              ) : (
                <p>No claims handler assigned</p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Loss Adjuster</p>
              {claim.loss_adjuster ? (
                <div>
                  <p>{claim.loss_adjuster.full_name}</p>
                  {claim.loss_adjuster.email && (
                    <p className="text-sm text-muted-foreground">{claim.loss_adjuster.email}</p>
                  )}
                  {claim.loss_adjuster.phone && (
                    <p className="text-sm text-muted-foreground">{claim.loss_adjuster.phone}</p>
                  )}
                </div>
              ) : (
                <p>No loss adjuster assigned</p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Insured Contact</p>
              {claim.insured_name ? (
                <div>
                  <p>{claim.insured_name}</p>
                  {claim.insured_contact && (
                    <p className="text-sm text-muted-foreground">{claim.insured_contact}</p>
                  )}
                </div>
              ) : (
                <p>No insured contact information</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
