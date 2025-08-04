'use client';

import React from 'react';
import { type EstimateLine } from '@/lib/api/domains/estimates/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useLineValidation } from '../validation';
import { ValidationIndicator } from '../validation/ValidationIndicator';
import { 
  Edit, 
  Trash2, 
  Copy, 
  MoreVertical,
  Clock,
  DollarSign,
  Hash,
  Wrench
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MobileEstimateLineCardProps {
  line: EstimateLine;
  allLines: EstimateLine[];
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  readonly?: boolean;
}

export function MobileEstimateLineCard({
  line,
  allLines,
  isSelected,
  onSelectionChange,
  onEdit,
  onDelete,
  onDuplicate,
  readonly = false
}: MobileEstimateLineCardProps) {
  const validation = useLineValidation(line, allLines);

  // Calculate line total
  const partTotal = (line.part_cost || 0) * (line.quantity || 1);
  const laborTotal = ((line.strip_fit_hours || 0) + (line.repair_hours || 0)) * 0; // TODO: get labor rate
  const paintTotal = (line.paint_hours || 0) * 0; // TODO: get paint rate
  const lineTotal = partTotal + laborTotal + paintTotal + (line.sublet_cost || 0);

  const hasHours = (line.strip_fit_hours || 0) + (line.repair_hours || 0) + (line.paint_hours || 0) > 0;
  const hasCosts = (line.part_cost || 0) + (line.sublet_cost || 0) > 0;

  return (
    <Card className={`
      relative transition-all duration-200
      ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
      ${!line.is_included ? 'opacity-60' : ''}
      ${validation.hasErrors ? 'border-red-300' : ''}
      ${validation.hasWarnings && !validation.hasErrors ? 'border-yellow-300' : ''}
    `}>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              disabled={readonly}
              className="mt-1"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                {line.sequence_number && (
                  <Badge variant="outline" className="text-xs">
                    #{line.sequence_number}
                  </Badge>
                )}
                
                {line.operation_code && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    {line.operation_code}
                  </Badge>
                )}
                
                {!line.is_included && (
                  <Badge variant="destructive" className="text-xs">
                    Excluded
                  </Badge>
                )}
                
                <ValidationIndicator 
                  level={validation.overallLevel} 
                  tooltip={`${validation.errorCount} errors, ${validation.warningCount} warnings`}
                />
              </div>
              
              <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                {line.description || 'No description'}
              </h4>
            </div>
          </div>
          
          {!readonly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Part and cost information */}
        {(line.part_type || line.part_number || hasCosts) && (
          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
            {line.part_type && (
              <div>
                <div className="text-gray-500 text-xs">Part Type</div>
                <div className="font-medium">{line.part_type}</div>
              </div>
            )}
            
            {line.part_number && (
              <div>
                <div className="text-gray-500 text-xs">Part Number</div>
                <div className="font-mono text-xs">{line.part_number}</div>
              </div>
            )}
            
            {line.part_cost && (
              <div>
                <div className="text-gray-500 text-xs flex items-center">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Part Cost
                </div>
                <div className="font-medium">
                  {line.part_cost.toFixed(2)}
                  {line.quantity && line.quantity > 1 && (
                    <span className="text-gray-500 ml-1">× {line.quantity}</span>
                  )}
                </div>
              </div>
            )}
            
            {line.sublet_cost && (
              <div>
                <div className="text-gray-500 text-xs">Sublet</div>
                <div className="font-medium">{line.sublet_cost.toFixed(2)}</div>
              </div>
            )}
          </div>
        )}

        {/* Hours information */}
        {hasHours && (
          <div className="mb-3">
            <div className="text-gray-500 text-xs flex items-center mb-1">
              <Clock className="h-3 w-3 mr-1" />
              Labor Hours
            </div>
            <div className="flex space-x-4 text-sm">
              {line.strip_fit_hours > 0 && (
                <span>Strip/Fit: {line.strip_fit_hours}h</span>
              )}
              {line.repair_hours > 0 && (
                <span>Repair: {line.repair_hours}h</span>
              )}
              {line.paint_hours > 0 && (
                <span>Paint: {line.paint_hours}h</span>
              )}
            </div>
          </div>
        )}

        {/* Line total */}
        {lineTotal > 0 && (
          <div className="border-t pt-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">Line Total</span>
            <span className="font-semibold text-lg">{lineTotal.toFixed(2)}</span>
          </div>
        )}

        {/* Validation errors (if any) */}
        {validation.hasErrors && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <div className="font-medium text-red-800 mb-1">Issues:</div>
            <ul className="text-red-700 space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>• {error.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Line notes */}
        {line.line_notes && (
          <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
            <div className="font-medium text-gray-700 mb-1">Notes:</div>
            <div className="text-gray-600">{line.line_notes}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}