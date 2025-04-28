'use client';

import dynamic from 'next/dynamic';

// Dynamically import the client-side session manager with ssr: false
const ClaimSessionManager = dynamic(() => import("./ClaimSessionManager.client"), {
  ssr: false,
});

interface ClaimSessionManagerWrapperProps {
  claimId: string;
}

export default function ClaimSessionManagerWrapper({ claimId }: ClaimSessionManagerWrapperProps) {
  return <ClaimSessionManager claimId={claimId} />;
}
