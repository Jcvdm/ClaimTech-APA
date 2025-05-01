'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

// Dynamically import the client-side session manager with ssr: false
const ClaimSessionManager = dynamic(() => import("./ClaimSessionManager.client"), {
  ssr: false,
});

interface ClaimSessionManagerWrapperProps {
  claimId: string;
}

export default function ClaimSessionManagerWrapper({ claimId }: ClaimSessionManagerWrapperProps) {
  // Log for debugging
  useEffect(() => {
    console.log(`[ClaimSessionManagerWrapper] Rendering for claim ${claimId}`);
  }, [claimId]);

  return <ClaimSessionManager claimId={claimId} />;
}
