'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOptimisticDeleteClaim } from "@/lib/api/domains/claims";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteClaimButtonProps {
  claimId: string;
  claimNumber: string;
}

export function DeleteClaimButton({ claimId, claimNumber }: DeleteClaimButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Use the optimistic delete hook from our DAL
  const deleteClaim = useOptimisticDeleteClaim();

  // Add navigation after successful deletion
  deleteClaim.onSuccess = () => {
    toast.success('Claim deleted successfully');
    router.push('/claims');
  };

  const handleDelete = () => {
    deleteClaim.mutate({ id: claimId });
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Claim</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete claim #{claimNumber} and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteClaim.isPending}
          >
            {deleteClaim.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
