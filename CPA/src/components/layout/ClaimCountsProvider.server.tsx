import { prefetchClaimCountsServer } from "@/lib/api/domains/claims/counts-prefetch.server";
import { type ClaimCountsResponse } from "@/lib/api/domains/claims/types";

// Default counts to use as fallback
const DEFAULT_COUNTS: ClaimCountsResponse = {
  active: 0,
  additionals: 0,
  frc: 0,
  finalized: 0,
  history: 0
};

// Helper function to create the script tag with counts data
function CountsScript({ counts }: { counts: ClaimCountsResponse }) {
  return (
    <script
      id="claim-counts-data"
      type="application/json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(counts)
      }}
    />
  );
}

// No longer needed with server component approach

export async function ClaimCountsProvider() {
  try {
    // Fetch claim counts on the server with a timeout to prevent hanging
    const countsPromise = prefetchClaimCountsServer();

    // Create a timeout promise with a longer timeout
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.log("[ClaimCountsProvider] Timeout reached, using default counts");
        // Resolve with null to avoid error
        resolve(null);
      }, 5000); // 5 second timeout
    });

    // Race the fetch against the timeout
    const counts = await Promise.race([
      countsPromise,
      timeoutPromise
    ]) as ClaimCountsResponse | null;

    // Default counts in case of undefined properties or timeout
    const safeData = {
      active: counts?.active ?? 0,
      additionals: counts?.additionals ?? 0,
      frc: counts?.frc ?? 0,
      finalized: counts?.finalized ?? 0,
      history: counts?.history ?? 0
    };

    // Return the script tag directly
    return <CountsScript counts={safeData} />;
  } catch (error) {
    console.error("[ClaimCountsProvider] Error rendering claim counts:", error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`[ClaimCountsProvider] Error message: ${error.message}`);
      console.error(`[ClaimCountsProvider] Error stack: ${error.stack}`);
    }

    // Return default counts in case of error
    return <CountsScript counts={DEFAULT_COUNTS} />;
  }
}
