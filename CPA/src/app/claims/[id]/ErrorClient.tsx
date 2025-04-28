"use client";
import React from "react";

interface Props { error: Error; reset: () => void; }

export default function ErrorClient({ error, reset }: Props) {
  console.error("[ClaimDetailsPage Error]", error);
  return (
    <div className="p-4">
      <h2 className="text-red-600">Error loading claim details</h2>
      <pre className="text-sm">{error.message}</pre>
      <button onClick={reset} className="mt-2 btn">
        Retry
      </button>
    </div>
  );
}
