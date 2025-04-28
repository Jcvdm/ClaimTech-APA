import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ClaimNotFound() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/claims">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Claim Not Found</h1>
        </div>
      </div>

      <div className="p-6 border rounded-md bg-muted/30">
        <h2 className="text-xl font-semibold mb-2">The requested claim could not be found</h2>
        <p className="text-muted-foreground mb-4">
          The claim ID you provided is either invalid or does not exist in the system.
        </p>
        <Link href="/claims">
          <Button>
            Return to Claims List
          </Button>
        </Link>
      </div>
    </div>
  );
}
