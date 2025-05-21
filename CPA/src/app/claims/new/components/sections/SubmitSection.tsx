'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

interface SubmitSectionProps {
  isSubmitting: boolean;
  claimCreationComplete: boolean;
  onSubmit: () => void;
}

export function SubmitSection({
  isSubmitting,
  claimCreationComplete,
  onSubmit
}: SubmitSectionProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Submit Claim</CardTitle>
        <CardDescription>
          Review the information above and submit the claim when ready.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || claimCreationComplete}
            size="lg"
            className="gap-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Claim...</span>
              </>
            ) : claimCreationComplete ? (
              <>
                <span>Claim Created</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Create Claim</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
