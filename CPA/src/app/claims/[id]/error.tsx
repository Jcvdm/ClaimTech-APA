"use client";

import ErrorClient from "./ErrorClient";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  // This runs on the server
  console.error("[ClaimDetailsPage Error]", error);
  return <ErrorClient error={error} reset={reset} />;
}