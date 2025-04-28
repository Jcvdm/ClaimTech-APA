'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useManualCacheControl } from '@/lib/api/domains/claims/claimCache';
import { Button } from './button';
import { useState } from 'react';

interface StaleDataIndicatorProps {
  claimId: string;
  threshold?: number;
  showRefreshButton?: boolean;
}

/**
 * Component that shows a warning when claim data might be stale
 * Optionally includes a refresh button to fetch fresh data
 */
export function StaleDataIndicator({ 
  claimId, 
  threshold = 30 * 60 * 1000, // 30 minutes
  showRefreshButton = true,
}: StaleDataIndicatorProps) {
  const { isClaimDataStale, getClaimDataAge, refreshClaimData } = useManualCacheControl();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Check if data is stale
  const isStale = isClaimDataStale(claimId, threshold);
  
  // If not stale, don't render anything
  if (!isStale) {
    return null;
  }
  
  // Get data age
  const dataAge = getClaimDataAge(claimId);
  
  // Format the time since last update
  const formatTimeAgo = (milliseconds: number): string => {
    if (milliseconds < 0) return 'unknown time';
    
    const minutes = Math.floor(milliseconds / (60 * 1000));
    
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshClaimData(claimId);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center text-amber-500">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">Data may be stale</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>This data was last updated {formatTimeAgo(dataAge)} ago.</p>
            <p>Click the refresh button to get the latest data.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showRefreshButton && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-7 px-2 text-xs"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      )}
    </div>
  );
}
