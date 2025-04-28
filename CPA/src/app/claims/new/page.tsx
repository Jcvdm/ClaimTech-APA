import type { Metadata } from "next";
import { NewClaimForm } from "./new-claim-form"; // Import the shared form component
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"; // Corrected import path

export const metadata: Metadata = {
  title: "New Claim",
  description: "Create a new claim entry.",
};

// This page component simply renders the dedicated form component
export default function NewClaimPage() {
  return (
    <div className="space-y-4">
       <Breadcrumb>
         <BreadcrumbList>
           <BreadcrumbItem>
             <BreadcrumbLink href="/claims">Claims</BreadcrumbLink>
           </BreadcrumbItem>
           <BreadcrumbSeparator />
           <BreadcrumbItem>
             <BreadcrumbPage>New Claim</BreadcrumbPage>
           </BreadcrumbItem>
         </BreadcrumbList>
       </Breadcrumb>
      <h2 className="text-3xl font-bold tracking-tight">Create New Claim</h2>
      {/* Render the dedicated form component */}
      <NewClaimForm />
    </div>
  );
}