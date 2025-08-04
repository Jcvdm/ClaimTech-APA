'use client';

import React from 'react';
import { type Estimate } from '@/lib/api/domains/estimates/types';
import { useEstimateLineContext } from './EstimateLineContext';
import { Calculator, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EstimateLineHeaderProps {
  estimate: Estimate;
}

export function EstimateLineHeader({ estimate }: EstimateLineHeaderProps) {
  const { lines, session, isLoading } = useEstimateLineContext();

  const totalLines = lines.length;
  const includedLines = lines.filter(line => line.is_included).length;
  const excludedLines = totalLines - includedLines;

  const hasUnsavedChanges = session.hasUnsavedChanges;
  const pendingChangesCount = session.pendingChangesCount;
  const conflictCount = session.conflictCount;

  return (
    <div className="border-b bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Estimate Lines
          </h3>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Calculator className="h-3 w-3" />
              <span>{totalLines} total</span>
            </Badge>
            
            {includedLines > 0 && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                {includedLines} included
              </Badge>
            )}
            
            {excludedLines > 0 && (
              <Badge variant="secondary">
                {excludedLines} excluded
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Auto-save status */}
          <div className="flex items-center space-x-2">
            {isLoading && (
              <div className="flex items-center space-x-1 text-blue-600">
                <Clock className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            )}
            
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-1 text-orange-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  {pendingChangesCount} unsaved change{pendingChangesCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            {conflictCount > 0 && (
              <div className="flex items-center space-x-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            {!isLoading && !hasUnsavedChanges && conflictCount === 0 && (
              <div className="flex items-center space-x-1 text-green-600">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Saved</span>
              </div>
            )}
          </div>

          {/* Estimate totals summary */}
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Estimate</div>
            <div className="text-lg font-semibold text-gray-900">
              {(estimate.total_amount || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Additional summary info */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>Claim: {estimate.claim_number || 'N/A'}</span>
          <span>•</span>
          <span>Created: {new Date(estimate.created_at).toLocaleDateString()}</span>
          {estimate.updated_at && estimate.updated_at !== estimate.created_at && (
            <>
              <span>•</span>
              <span>Modified: {new Date(estimate.updated_at).toLocaleDateString()}</span>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <span>Parts: {(estimate.subtotal_parts || 0).toFixed(2)}</span>
          <span>Labor: {(estimate.subtotal_labor || 0).toFixed(2)}</span>
          <span>Paint: {(estimate.subtotal_paint_materials || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}