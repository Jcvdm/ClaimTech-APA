'use client';

export function ClaimListError({ message }: { message?: string }) {
  return (
    <div className="p-4 border border-destructive rounded-md bg-destructive/10">
      <h3 className="font-semibold text-destructive">Error loading claims</h3>
      <p className="text-sm text-destructive/80">{message || "Unknown error occurred"}</p>
    </div>
  );
}
