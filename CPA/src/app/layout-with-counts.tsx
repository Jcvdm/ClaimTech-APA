import { ClaimCountsProvider } from "@/components/layout/ClaimCountsProvider.server";
import { Layout } from "@/components/layout/Layout";

export default function LayoutWithCounts({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Server component to fetch and provide claim counts */}
      <ClaimCountsProvider />
      
      {/* Client component that will consume the counts */}
      <Layout>{children}</Layout>
    </>
  );
}
