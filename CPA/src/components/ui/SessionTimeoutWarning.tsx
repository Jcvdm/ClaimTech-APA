'use client';

import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CACHE_TIMES } from '@/lib/api/domains/claims/constants';
import { useActiveClaimSession } from '@/lib/api/domains/claims/useActiveClaimSession';
import { useManualCacheControl } from '@/lib/api/domains/claims/claimCache';
import { Clock } from 'lucide-react';

interface SessionTimeoutWarningProps {
  claimId: string;
  warningThreshold?: number; // Time before expiry to show warning
}

/**
 * Component that shows a warning when a claim session is about to expire
 * Gives the user the option to extend their session
 */
export function SessionTimeoutWarning({
  claimId,
  warningThreshold = 5 * 60 * 1000, // 5 minutes
}: SessionTimeoutWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { extendSession } = useActiveClaimSession(claimId);
  const { refreshClaimData } = useManualCacheControl();
  
  useEffect(() => {
    if (!claimId) return;
    
    const activityKey = `claim-session-${claimId}`;
    
    // Check if we should show the warning
    const checkWarning = () => {
      const lastActivityStr = sessionStorage.getItem(activityKey);
      
      if (!lastActivityStr) {
        setShowWarning(false);
        return;
      }
      
      const lastActivity = parseInt(lastActivityStr, 10);
      const sessionDuration = CACHE_TIMES.ACTIVE_SESSION.STALE_TIME;
      const expiryTime = lastActivity + sessionDuration;
      const warningTime = expiryTime - warningThreshold;
      const now = Date.now();
      const remaining = expiryTime - now;
      
      setTimeRemaining(Math.max(0, remaining));
      
      if (now >= warningTime && now < expiryTime) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };
    
    // Initial check
    checkWarning();
    
    // Set up interval to check regularly
    const interval = setInterval(checkWarning, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, [claimId, warningThreshold]);
  
  // Format time remaining
  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / (60 * 1000));
    
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  };
  
  // Handle extend session
  const handleExtend = async () => {
    if (!claimId) return;
    
    // Extend the session
    extendSession();
    
    // Refresh data
    await refreshClaimData(claimId);
    
    // Hide warning
    setShowWarning(false);
  };
  
  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-amber-500" />
            Session About to Expire
          </AlertDialogTitle>
          <AlertDialogDescription>
            <p className="mb-2">
              Your claim session will expire in approximately <strong>{formatTimeRemaining()}</strong>.
            </p>
            <p>
              Would you like to extend your session? This will refresh your data and keep the claim in cache.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleExtend}>
            Extend Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
