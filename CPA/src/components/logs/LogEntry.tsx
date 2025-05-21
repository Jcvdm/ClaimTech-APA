"use client";

import { ClaimLog, ClaimLogType } from "@/lib/api/domains/logs/types";
import { formatDate } from "@/lib/utils";
import { 
  FileText, 
  Calendar, 
  ClipboardCheck, 
  FileEdit, 
  PlusCircle, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User
} from "lucide-react";

interface LogEntryProps {
  log: ClaimLog;
}

export function LogEntry({ log }: LogEntryProps) {
  // Function to get the appropriate icon based on log type
  const getLogIcon = () => {
    switch (log.log_type) {
      case ClaimLogType.CLAIM_CREATED:
        return <FileText className="h-4 w-4 text-blue-500" />;
      case ClaimLogType.CLAIM_UPDATED:
        return <FileEdit className="h-4 w-4 text-blue-500" />;
      case ClaimLogType.CLAIM_STATUS_CHANGED:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case ClaimLogType.APPOINTMENT_CREATED:
        return <Calendar className="h-4 w-4 text-green-500" />;
      case ClaimLogType.APPOINTMENT_UPDATED:
        return <Calendar className="h-4 w-4 text-green-500" />;
      case ClaimLogType.APPOINTMENT_CANCELED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case ClaimLogType.APPOINTMENT_RESCHEDULED:
        return <Clock className="h-4 w-4 text-amber-500" />;
      case ClaimLogType.INSPECTION_STARTED:
        return <ClipboardCheck className="h-4 w-4 text-purple-500" />;
      case ClaimLogType.INSPECTION_COMPLETED:
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case ClaimLogType.ESTIMATE_CREATED:
        return <FileText className="h-4 w-4 text-indigo-500" />;
      case ClaimLogType.ESTIMATE_UPDATED:
        return <FileEdit className="h-4 w-4 text-indigo-500" />;
      case ClaimLogType.ADDITIONAL_CREATED:
        return <PlusCircle className="h-4 w-4 text-orange-500" />;
      case ClaimLogType.ADDITIONAL_APPROVED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ClaimLogType.ADDITIONAL_REJECTED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case ClaimLogType.MANUAL_LOG:
        return <User className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex items-start space-x-3 py-2 border-b border-gray-100 last:border-0">
      <div className="mt-0.5">{getLogIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{log.message}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDate(new Date(log.created_at))}
        </p>
      </div>
    </div>
  );
}
