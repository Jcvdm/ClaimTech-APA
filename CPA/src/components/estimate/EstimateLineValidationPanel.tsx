'use client';

import React, { useMemo } from 'react';
import { useEstimateLineContext } from './EstimateLineContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  X,
  ExternalLink
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type ValidationLevel = 'error' | 'warning' | 'info' | 'success';

interface ValidationIssue {
  id: string;
  level: ValidationLevel;
  title: string;
  description: string;
  lineId?: string;
  lineSequence?: number;
  field?: string;
  suggestion?: string;
  autoFixable?: boolean;
}

export function EstimateLineValidationPanel() {
  const { lines, estimate } = useEstimateLineContext();

  // Generate validation issues
  const validationIssues = useMemo((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // Check for missing required fields
    lines.forEach((line, index) => {
      if (!line.description || line.description.trim() === '') {
        issues.push({
          id: `desc-${line.id}`,
          level: 'error',
          title: 'Missing Description',
          description: `Line ${line.sequence_number || index + 1} is missing a description`,
          lineId: line.id,
          lineSequence: line.sequence_number || index + 1,
          field: 'description',
          suggestion: 'Add a clear description for this line item'
        });
      }

      // Check for missing operation codes
      if (!line.operation_code) {
        issues.push({
          id: `op-${line.id}`,
          level: 'warning',
          title: 'Missing Operation Code',
          description: `Line ${line.sequence_number || index + 1} has no operation code`,
          lineId: line.id,
          lineSequence: line.sequence_number || index + 1,
          field: 'operation_code',
          suggestion: 'Specify the operation type (R&R, REPAIR, PAINT, etc.)'
        });
      }

      // Check for unrealistic values
      if (line.part_cost && line.part_cost > 10000) {
        issues.push({
          id: `cost-${line.id}`,
          level: 'warning',
          title: 'High Part Cost',
          description: `Line ${line.sequence_number || index + 1} has unusually high part cost`,
          lineId: line.id,
          lineSequence: line.sequence_number || index + 1,
          field: 'part_cost',
          suggestion: 'Verify the part cost is correct'
        });
      }

      // Check for missing quantities
      if (line.part_cost && line.part_cost > 0 && (!line.quantity || line.quantity <= 0)) {
        issues.push({
          id: `qty-${line.id}`,
          level: 'error',
          title: 'Invalid Quantity',
          description: `Line ${line.sequence_number || index + 1} has part cost but no valid quantity`,
          lineId: line.id,
          lineSequence: line.sequence_number || index + 1,
          field: 'quantity',
          suggestion: 'Set quantity to at least 1',
          autoFixable: true
        });
      }

      // Check for labor without hours
      if (line.operation_code === 'REPAIR' && (!line.repair_hours || line.repair_hours <= 0)) {
        issues.push({
          id: `hours-${line.id}`,
          level: 'warning',
          title: 'Repair Without Hours',
          description: `Line ${line.sequence_number || index + 1} is marked as repair but has no hours`,
          lineId: line.id,
          lineSequence: line.sequence_number || index + 1,
          field: 'repair_hours',
          suggestion: 'Add repair hours or change operation code'
        });
      }
    });

    // Check estimate-level issues
    if (lines.length === 0) {
      issues.push({
        id: 'no-lines',
        level: 'info',
        title: 'No Estimate Lines',
        description: 'This estimate has no line items',
        suggestion: 'Add line items to build your estimate'
      });
    }

    const includedLines = lines.filter(line => line.is_included);
    if (includedLines.length === 0 && lines.length > 0) {
      issues.push({
        id: 'no-included',
        level: 'warning',
        title: 'No Included Lines',
        description: 'All lines are excluded from the estimate',
        suggestion: 'Include at least one line item in the estimate'
      });
    }

    // Check for duplicate sequence numbers
    const sequenceNumbers = new Map<number, string[]>();
    lines.forEach(line => {
      if (line.sequence_number) {
        if (!sequenceNumbers.has(line.sequence_number)) {
          sequenceNumbers.set(line.sequence_number, []);
        }
        sequenceNumbers.get(line.sequence_number)!.push(line.id);
      }
    });

    sequenceNumbers.forEach((lineIds, seq) => {
      if (lineIds.length > 1) {
        issues.push({
          id: `dup-seq-${seq}`,
          level: 'error',
          title: 'Duplicate Sequence Numbers',
          description: `Multiple lines have sequence number ${seq}`,
          suggestion: 'Assign unique sequence numbers to each line',
          autoFixable: true
        });
      }
    });

    return issues;
  }, [lines, estimate]);

  const issuesByLevel = useMemo(() => {
    return {
      error: validationIssues.filter(issue => issue.level === 'error'),
      warning: validationIssues.filter(issue => issue.level === 'warning'),
      info: validationIssues.filter(issue => issue.level === 'info'),
      success: validationIssues.filter(issue => issue.level === 'success')
    };
  }, [validationIssues]);

  const totalIssues = validationIssues.length;
  const errorCount = issuesByLevel.error.length;
  const warningCount = issuesByLevel.warning.length;

  const getIssueIcon = (level: ValidationLevel) => {
    switch (level) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const handleGoToLine = (lineId: string) => {
    // Scroll to and highlight the specific line
    const element = document.querySelector(`[data-line-id="${lineId}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleAutoFix = (issue: ValidationIssue) => {
    console.log('Auto-fixing issue:', issue);
    // Implement auto-fix logic here
  };

  if (totalIssues === 0) {
    return (
      <div className="border-t bg-green-50 p-3">
        <div className="flex items-center space-x-2 text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">All validations passed</span>
        </div>
      </div>
    );
  }

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <div className="border-t bg-yellow-50 p-3 cursor-pointer hover:bg-yellow-100 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Validation Issues ({totalIssues})
              </span>
              <div className="flex items-center space-x-1">
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {errorCount} errors
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-800">
                    {warningCount} warnings
                  </Badge>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-500">Click to expand</span>
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="border-t bg-white p-4 max-h-64 overflow-y-auto">
          <div className="space-y-3">
            {validationIssues.map((issue) => (
              <Alert key={issue.id} className={`
                ${issue.level === 'error' ? 'border-red-200 bg-red-50' : ''}
                ${issue.level === 'warning' ? 'border-yellow-200 bg-yellow-50' : ''}
                ${issue.level === 'info' ? 'border-blue-200 bg-blue-50' : ''}
              `}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 flex-1">
                    {getIssueIcon(issue.level)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{issue.title}</div>
                      <AlertDescription className="text-xs mt-1">
                        {issue.description}
                      </AlertDescription>
                      {issue.suggestion && (
                        <div className="text-xs text-gray-600 mt-1 italic">
                          Suggestion: {issue.suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    {issue.lineId && (
                      <Button
                        onClick={() => handleGoToLine(issue.lineId!)}
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {issue.autoFixable && (
                      <Button
                        onClick={() => handleAutoFix(issue)}
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                      >
                        Fix
                      </Button>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}