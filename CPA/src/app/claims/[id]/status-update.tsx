'use client';

import { useState } from "react";
import { useOptimisticUpdateClaimStatus } from "@/lib/api/domains/claims";
import { ClaimStatus } from "@/lib/api/domains/claims/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface StatusUpdateProps {
  claimId: string;
  currentStatus: ClaimStatus;
}

export function StatusUpdate({ claimId, currentStatus }: StatusUpdateProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ClaimStatus | undefined>(undefined);

  // Get available next statuses based on current status
  const getAvailableStatuses = (current: ClaimStatus): ClaimStatus[] => {
    switch (current) {
      case ClaimStatus.NEW:
        return [ClaimStatus.APPOINTED, ClaimStatus.CANCELED];
      case ClaimStatus.APPOINTED:
        return [ClaimStatus.INSPECTION_DONE, ClaimStatus.CANCELED];
      case ClaimStatus.INSPECTION_DONE:
        return [ClaimStatus.REPORT_SENT, ClaimStatus.CANCELED];
      case ClaimStatus.REPORT_SENT:
        return [ClaimStatus.AUTHORIZED, ClaimStatus.CANCELED];
      case ClaimStatus.AUTHORIZED:
        return [ClaimStatus.FRC_REQUESTED, ClaimStatus.CANCELED];
      case ClaimStatus.FRC_REQUESTED:
        return [ClaimStatus.FRC_ACTIVE, ClaimStatus.CANCELED];
      case ClaimStatus.FRC_ACTIVE:
        return [ClaimStatus.FRC_FINALIZED, ClaimStatus.CANCELED];
      default:
        return [];
    }
  };

  const availableStatuses = getAvailableStatuses(currentStatus as ClaimStatus);

  // Use the optimistic update hook from our DAL
  const updateStatus = useOptimisticUpdateClaimStatus();

  const handleStatusChange = () => {
    if (selectedStatus) {
      updateStatus.mutate({
        id: claimId,
        status: selectedStatus
      });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Update Status</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Claim Status</DialogTitle>
          <DialogDescription>
            Select the new status for this claim.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select onValueChange={(value) => setSelectedStatus(value as ClaimStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Select new status" />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleStatusChange}
            disabled={!selectedStatus || updateStatus.isPending}
          >
            {updateStatus.isPending ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
