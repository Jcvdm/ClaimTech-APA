'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Save, 
  Download, 
  Upload, 
  RefreshCw,
  Archive,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEstimateLineContext } from './EstimateLineContext';

interface EstimateLineToolbarProps {
  onAddLine: () => void;
  selectedCount: number;
  onBulkDelete: () => void;
  enableBulkActions?: boolean;
  readonly?: boolean;
}

export function EstimateLineToolbar({
  onAddLine,
  selectedCount,
  onBulkDelete,
  enableBulkActions = true,
  readonly = false
}: EstimateLineToolbarProps) {
  const { session, keyboardNav } = useEstimateLineContext();

  const handleSaveAll = () => {
    session.syncNow();
  };

  const handleDuplicateSelected = () => {
    console.log('Duplicate selected lines');
  };

  const handleArchiveSelected = () => {
    console.log('Archive selected lines');
  };

  const handleExportData = () => {
    console.log('Export estimate data');
  };

  const handleImportData = () => {
    console.log('Import estimate data');
  };

  const handleRefreshData = () => {
    console.log('Refresh estimate data');
  };

  return (
    <div className="border-b bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Primary actions */}
          {!readonly && (
            <>
              <Button 
                onClick={onAddLine}
                size="sm"
                className="flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Add Line</span>
              </Button>

              {session.hasUnsavedChanges && (
                <Button 
                  onClick={handleSaveAll}
                  size="sm"
                  variant="outline"
                  className="flex items-center space-x-1"
                >
                  <Save className="h-4 w-4" />
                  <span>Save All ({session.pendingChangesCount})</span>
                </Button>
              )}
            </>
          )}

          {/* Bulk actions */}
          {enableBulkActions && selectedCount > 0 && (
            <div className="flex items-center space-x-2 border-l pl-2 ml-2">
              <span className="text-sm text-gray-600">
                {selectedCount} selected
              </span>
              
              {!readonly && (
                <>
                  <Button
                    onClick={handleDuplicateSelected}
                    size="sm"
                    variant="outline"
                    className="flex items-center space-x-1"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Duplicate</span>
                  </Button>

                  <Button
                    onClick={onBulkDelete}
                    size="sm"
                    variant="destructive"
                    className="flex items-center space-x-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Data actions */}
          <div className="flex items-center space-x-1">
            <Button
              onClick={handleRefreshData}
              size="sm"
              variant="ghost"
              className="flex items-center space-x-1"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </DropdownMenuItem>
                
                {!readonly && (
                  <DropdownMenuItem onClick={handleImportData}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                
                {selectedCount > 0 && !readonly && (
                  <DropdownMenuItem onClick={handleArchiveSelected}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Selected
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts info */}
      {keyboardNav.enabled && (
        <div className="mt-2 text-xs text-gray-500">
          <span className="mr-4">Tab: Navigate</span>
          <span className="mr-4">Ctrl+S: Save</span>
          <span className="mr-4">Ctrl+N: New Line</span>
          <span className="mr-4">Del: Delete Selected</span>
        </div>
      )}
    </div>
  );
}