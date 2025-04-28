import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ClaimDetails, type ClaimSummary, ClaimStatus, ClaimInstruction, TypeOfLoss } from "@/lib/api/domains/claims/types";
import { formatDate } from "@/lib/utils";

interface OverviewTabProps {
  claimData: {
    details?: ClaimDetails | null;
    summary?: ClaimSummary | null;
  };
}

export default function OverviewTab({ claimData }: OverviewTabProps) {
  // Use details if available, otherwise fall back to summary
  const data = claimData.details || claimData.summary;
  
  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Claim Overview</h2>
        <p className="text-muted-foreground">No claim data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Claim Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Claim Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Job Number</p>
                <p>{data.job_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p>{data.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Loss</p>
                <p>{data.date_of_loss ? formatDate(new Date(data.date_of_loss)) : 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time of Loss</p>
                <p>{claimData.details?.time_of_loss || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type of Loss</p>
                <p>{data.type_of_loss || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Instruction</p>
                <p>{claimData.details?.instruction || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client Reference</p>
                <p>{claimData.details?.client_reference || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created At</p>
                <p>{claimData.details?.created_at ? formatDate(new Date(claimData.details.created_at)) : 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client Name</p>
                <p>{data.client?.name || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Claims Handler</p>
                <p>{claimData.details?.claims_handler_name || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Handler Contact</p>
                <p>{claimData.details?.claims_handler_contact || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Handler Email</p>
                <p>{claimData.details?.claims_handler_email || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Insured Name</p>
                <p>{claimData.details?.insured_name || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Insured Contact</p>
                <p>{claimData.details?.insured_contact || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {claimData.details?.accident_description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Accident Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{claimData.details.accident_description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
