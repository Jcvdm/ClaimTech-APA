'use client';

export function ClaimListEmpty() {
  return (
    <div className="p-4 border rounded-md">
      <h3 className="font-semibold">No claims found</h3>
      <p className="text-sm text-muted-foreground">There are no claims available at this time.</p>
    </div>
  );
}
