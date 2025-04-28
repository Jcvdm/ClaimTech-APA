'use client';

import { useActiveClaimSession } from '@/lib/api/domains/claims/useActiveClaimSession';
import { StaleDataIndicator } from '@/components/ui/StaleDataIndicator';
import { SessionTimeoutWarning } from '@/components/ui/SessionTimeoutWarning';
import { useManualCacheControl } from '@/lib/api/domains/claims/claimCache';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { createEntityQueryKey } from '@/lib/api/utils';
import { apiClient } from '@/lib/api/client';

interface ClaimSessionManagerProps {
  claimId: string;
}

/**
 * Component that manages claim session and provides cache control UI
 * This should be included in claim detail pages
 */
export default function ClaimSessionManager({ claimId }: ClaimSessionManagerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refreshClaimData } = useManualCacheControl();

  // Track this as an active claim session
  useActiveClaimSession(claimId);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshClaimData(claimId);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Generate query key for the claim details
  const detailsQueryKey = createEntityQueryKey('claim', 'getDetails', claimId);

  return (
    <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md mb-4">
      <div className="flex items-center gap-2">
        <StaleDataIndicator
          claimId={claimId}
          showRefreshButton={false}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 px-3"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Session timeout warning (hidden until session is about to expire) */}
      <SessionTimeoutWarning claimId={claimId} />
    </div>
  );
}
