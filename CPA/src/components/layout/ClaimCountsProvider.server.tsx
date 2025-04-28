import { prefetchClaimCountsServer } from "@/lib/api/domains/claims/counts-prefetch.server";
import { type ClaimCountsResponse } from "@/lib/api/domains/claims/types";

export async function ClaimCountsProvider() {
  // Fetch claim counts on the server
  const counts = await prefetchClaimCountsServer();
  
  // Convert to a JSON string to pass to the client component
  return (
    <script
      id="claim-counts-data"
      type="application/json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          active: counts.active,
          additionals: counts.additionals,
          frc: counts.frc,
          finalized: counts.finalized,
          history: counts.history
        })
      }}
    />
  );
}
