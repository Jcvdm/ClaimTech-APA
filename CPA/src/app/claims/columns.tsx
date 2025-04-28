"use client"

import React from 'react';
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { type RouterOutputs } from "@/trpc/shared"
import type { ColumnDef } from "@tanstack/react-table";
import type { ClaimListItem } from "@/lib/api/domains/claims/types";

// Use the type from the tRPC router output
export type ClaimWithRelations = RouterOutputs["claim"]["getAll"][number]

export const columns: ColumnDef<ClaimListItem>[] = [
  {
    accessorKey: "select",
    header: "Select",
    cell: () => (
      <Checkbox
        aria-label="Select row"
      />
    ),
  },
  {
    id: "job_number",
    header: "Job Number",
    cell: ({ row }) => <div>{row.original.job_number ?? 'N/A'}</div>,
  },
  {
    id: "client_reference",
    header: "Client Reference",
    cell: ({ row }) => <div>{row.original.client_reference ?? 'N/A'}</div>,
  },
  {
    id: "client_name",
    header: "Client Name",
    accessorFn: row => row.client?.name ?? 'N/A',
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status as string

      const statusMap: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
        received: {
          label: "Received",
          variant: "default",
        },
        in_progress: {
          label: "In Progress",
          variant: "secondary",
        },
        pending: {
          label: "Pending",
          variant: "outline",
        },
        completed: {
          label: "Completed",
          variant: "secondary",
        },
      }

      const { label, variant } = statusMap[status] || {
        label: status,
        variant: "default",
      }

      return <Badge variant={variant}>{label}</Badge>
    },
  },
  {
    id: "created_at",
    header: "Request Date",
    cell: ({ row }) => {
      // Add defensive code to handle different date formats
      try {
        const dateValue = row.original.created_at;

        // Check if dateValue exists and is valid
        if (!dateValue) return <div>N/A</div>;

        // Convert string to Date if it's not already a Date
        const date = dateValue instanceof Date
          ? dateValue
          : new Date(dateValue);

        // Check if the date is valid
        if (isNaN(date.getTime())) return <div>Invalid Date</div>;

        // Format the date
        return <div>{date.toLocaleDateString()}</div>;
      } catch (error) {
        console.error("Error formatting date:", error, row.original.created_at);
        return <div>Error</div>;
      }
    },
  },
  {
    id: "vehicle",
    header: "Vehicle",
    accessorFn: row => {
      console.log("Vehicle row:", row);
      console.log("Vehicle data:", row.vehicle);
      return row.vehicle
        ? `${row.vehicle.make ?? ''} ${row.vehicle.model ?? ''}`.trim()
        : 'N/A';
    }
  },
  {
    id: "registration",
    header: "Registration",
    cell: ({ row }) => {
      console.log("Registration row:", row.original);
      console.log("Registration vehicle:", row.original.vehicle);
      return <div>{row.original.vehicle?.registration_number ?? 'N/A'}</div>;
    },
  },
  {
    id: "actions",
    header: "Open",
    cell: ({ row }) => {
      return (
        <Link href={`/claims/${row.original.id}`} passHref>
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            Open
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      )
    },
  },
]
