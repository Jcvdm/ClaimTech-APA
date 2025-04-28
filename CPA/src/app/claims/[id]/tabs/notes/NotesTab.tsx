import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ClaimDetails } from "@/lib/api/domains/claims/types";
import { formatDate } from "@/lib/utils";

interface NotesTabProps {
  claimData: {
    details?: ClaimDetails | null;
    summary?: any | null;
  };
}

export default function NotesTab({ claimData }: NotesTabProps) {
  // Use details if available
  const data = claimData.details;
  
  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Notes</h2>
        <p className="text-muted-foreground">No claim data available</p>
      </div>
    );
  }

  // For now, we'll just display the accident description as a note
  // In a real implementation, this would be replaced with actual notes from the database
  const hasNotes = !!data.accident_description;

  if (!hasNotes) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Notes</h2>
        <p className="text-muted-foreground">No notes available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Notes</h2>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Accident Description</CardTitle>
          <p className="text-sm text-muted-foreground">
            Added on {data.created_at ? formatDate(new Date(data.created_at)) : 'unknown date'}
          </p>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{data.accident_description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
