'use client';

import { type ClaimWithRelations } from "@/lib/api/domains/claims/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface ClaimListItemsProps {
  claims: ClaimWithRelations[];
}

export function ClaimListItems({ claims }: ClaimListItemsProps) {
  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <div key={claim.id} className="p-4 border rounded-md">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">{claim.job_number}</h3>
              <p className="text-sm text-muted-foreground">
                {claim.vehicle?.make} {claim.vehicle?.model}
              </p>
            </div>
            <Link href={`/claims/${claim.id}`}>
              <Button variant="outline" size="sm">
                View <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
