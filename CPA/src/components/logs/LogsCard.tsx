"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useClaimLogs, useLogManualEntry } from "@/lib/api/domains/logs/hooks";
import { LogEntry } from "./LogEntry";

interface LogsCardProps {
  claimId: string;
}

export function LogsCard({ claimId }: LogsCardProps) {
  const [manualLogMessage, setManualLogMessage] = useState("");
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [limit, setLimit] = useState(10);

  const {
    data: logs = [], // Provide a default empty array
    isLoading,
    isError,
    refetch
  } = useClaimLogs({
    claim_id: claimId,
    limit,
  });

  const logManualEntry = useLogManualEntry();

  const handleAddManualLog = async () => {
    if (!manualLogMessage.trim()) return;

    setIsAddingLog(true);
    try {
      await logManualEntry.mutateAsync(claimId, manualLogMessage);
      setManualLogMessage("");
      refetch();
    } catch (error) {
      console.error("Failed to add manual log:", error);
    } finally {
      setIsAddingLog(false);
    }
  };

  const handleLoadMore = () => {
    setLimit(prev => prev + 10);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Activity Log</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Input
            placeholder="Add a note to the log..."
            value={manualLogMessage}
            onChange={(e) => setManualLogMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddManualLog();
              }
            }}
            disabled={isAddingLog}
          />
          <Button
            onClick={handleAddManualLog}
            disabled={!manualLogMessage.trim() || isAddingLog}
            size="sm"
          >
            {isAddingLog ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ml-1">Add</span>
          </Button>
        </div>

        {isLoading && logs.length === 0 ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-red-500">
            <div>Failed to load logs. Please try again.</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No activity logs yet.
          </div>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
            {logs.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))}
            {logs.length >= limit && (
              <div className="pt-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
