import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { ClientClaims } from "./client-claims";
import { getQueryClient } from "@/trpc/query-client";
import { api } from "@/trpc/server";
import { QUERY_KEYS, CACHE_TIMES } from "@/lib/api/constants";

export const metadata: Metadata = {
  title: "Claims Management",
  description: "View and manage all claims in the system.",
};

export default async function ClaimsPage() {
  // Get the query client
  const queryClient = getQueryClient();

  // Prefetch claims data on the server
  await queryClient.prefetchQuery({
    queryKey: QUERY_KEYS.CLAIMS.ALL,
    queryFn: () => api.claim.getAll.query(),
    staleTime: CACHE_TIMES.MEDIUM,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Claims</h2>
          <p className="text-muted-foreground">
            Manage and view all claims in the system
          </p>
        </div>
        <Link href="/claims/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Claim
          </Button>
        </Link>
      </div>
      <ClientClaims dehydratedState={dehydrate(queryClient)} />
    </div>
  );
}
