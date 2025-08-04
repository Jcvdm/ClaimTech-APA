'use client';

import { useMemo } from 'react';
import { type EstimateLine } from '@/lib/api/domains/estimates/types';
import { type ValidationLevel } from './ValidationBadge';

export interface FieldValidationResult {
  level?: ValidationLevel;
  message?: string;
  isValid: boolean;
}

export interface ValidationRule {
  field: keyof EstimateLine;
  validate: (line: EstimateLine, allLines: EstimateLine[]) => FieldValidationResult;
}

// Common validation rules
export const VALIDATION_RULES: ValidationRule[] = [
  // Description is required
  {
    field: 'description',
    validate: (line) => {
      if (!line.description || line.description.trim() === '') {
        return {
          level: 'error',
          message: 'Description is required',
          isValid: false
        };
      }
      if (line.description.length > 500) {
        return {
          level: 'warning',
          message: 'Description is very long',
          isValid: true
        };
      }
      return { isValid: true };
    }
  },

  // Operation code validation
  {
    field: 'operation_code',
    validate: (line) => {
      if (!line.operation_code) {
        return {
          level: 'warning',
          message: 'Operation code recommended',
          isValid: true
        };
      }
      return { isValid: true };
    }
  },

  // Part cost validation
  {
    field: 'part_cost',
    validate: (line) => {
      if (line.part_cost !== null && line.part_cost !== undefined) {
        if (line.part_cost < 0) {
          return {
            level: 'error',
            message: 'Cost cannot be negative',
            isValid: false
          };
        }
        if (line.part_cost > 50000) {
          return {
            level: 'warning',
            message: 'Unusually high cost',
            isValid: true
          };
        }
      }
      return { isValid: true };
    }
  },

  // Quantity validation
  {
    field: 'quantity',
    validate: (line) => {
      if (line.part_cost && line.part_cost > 0) {
        if (!line.quantity || line.quantity <= 0) {
          return {
            level: 'error',
            message: 'Quantity required when cost specified',
            isValid: false
          };
        }
      }
      if (line.quantity && line.quantity > 100) {
        return {
          level: 'warning',
          message: 'High quantity',
          isValid: true
        };
      }
      return { isValid: true };
    }
  },

  // Hours validation
  {
    field: 'strip_fit_hours',
    validate: (line) => {
      if (line.strip_fit_hours !== null && line.strip_fit_hours !== undefined) {
        if (line.strip_fit_hours < 0) {
          return {
            level: 'error',
            message: 'Hours cannot be negative',
            isValid: false
          };
        }
        if (line.strip_fit_hours > 50) {
          return {
            level: 'warning',
            message: 'Very high hours',
            isValid: true
          };
        }
      }
      return { isValid: true };
    }
  },

  {
    field: 'repair_hours',
    validate: (line) => {
      if (line.repair_hours !== null && line.repair_hours !== undefined) {
        if (line.repair_hours < 0) {
          return {
            level: 'error',
            message: 'Hours cannot be negative',
            isValid: false
          };
        }
        if (line.repair_hours > 50) {
          return {
            level: 'warning',
            message: 'Very high hours',
            isValid: true
          };
        }
      }
      
      // Check if repair operation has hours
      if (line.operation_code === 'REPAIR' && (!line.repair_hours || line.repair_hours === 0)) {
        return {
          level: 'warning',
          message: 'Repair operation typically needs hours',
          isValid: true
        };
      }
      
      return { isValid: true };
    }
  },

  {
    field: 'paint_hours',
    validate: (line) => {
      if (line.paint_hours !== null && line.paint_hours !== undefined) {
        if (line.paint_hours < 0) {
          return {
            level: 'error',
            message: 'Hours cannot be negative',
            isValid: false
          };
        }
        if (line.paint_hours > 30) {
          return {
            level: 'warning',
            message: 'Very high paint hours',
            isValid: true
          };
        }
      }
      
      // Check if paint operation has hours
      if (line.operation_code === 'PAINT' && (!line.paint_hours || line.paint_hours === 0)) {
        return {
          level: 'warning',
          message: 'Paint operation typically needs hours',
          isValid: true
        };
      }
      
      return { isValid: true };
    }
  },

  // Sublet cost validation
  {
    field: 'sublet_cost',
    validate: (line) => {
      if (line.sublet_cost !== null && line.sublet_cost !== undefined) {
        if (line.sublet_cost < 0) {
          return {
            level: 'error',
            message: 'Cost cannot be negative',
            isValid: false
          };
        }
        if (line.sublet_cost > 20000) {
          return {
            level: 'warning',
            message: 'Very high sublet cost',
            isValid: true
          };
        }
      }
      return { isValid: true };
    }
  },

  // Part number validation
  {
    field: 'part_number',
    validate: (line) => {
      if (line.part_cost && line.part_cost > 0 && !line.part_number) {
        return {
          level: 'warning',
          message: 'Part number recommended when cost specified',
          isValid: true
        };
      }
      return { isValid: true };
    }
  },

  // Sequence number validation
  {
    field: 'sequence_number',
    validate: (line, allLines) => {
      if (line.sequence_number) {
        const duplicates = allLines.filter(l => 
          l.id !== line.id && l.sequence_number === line.sequence_number
        );
        if (duplicates.length > 0) {
          return {
            level: 'error',
            message: 'Duplicate sequence number',
            isValid: false
          };
        }
      }
      return { isValid: true };
    }
  }
];

export function useFieldValidation(line: EstimateLine, allLines: EstimateLine[]) {
  return useMemo(() => {
    const results: Record<keyof EstimateLine, FieldValidationResult> = {} as any;
    
    VALIDATION_RULES.forEach(rule => {
      results[rule.field] = rule.validate(line, allLines);
    });
    
    return results;
  }, [line, allLines]);
}

export function useLineValidation(line: EstimateLine, allLines: EstimateLine[]) {
  const fieldResults = useFieldValidation(line, allLines);
  
  return useMemo(() => {
    const errors = Object.values(fieldResults).filter(r => r.level === 'error');
    const warnings = Object.values(fieldResults).filter(r => r.level === 'warning');
    const info = Object.values(fieldResults).filter(r => r.level === 'info');
    
    const hasErrors = errors.length > 0;
    const hasWarnings = warnings.length > 0;
    const hasInfo = info.length > 0;
    
    let overallLevel: ValidationLevel | undefined;
    if (hasErrors) overallLevel = 'error';
    else if (hasWarnings) overallLevel = 'warning';
    else if (hasInfo) overallLevel = 'info';
    else overallLevel = 'success';
    
    return {
      fieldResults,
      errors,
      warnings,
      info,
      hasErrors,
      hasWarnings,
      hasInfo,
      overallLevel,
      isValid: !hasErrors,
      errorCount: errors.length,
      warningCount: warnings.length,
      infoCount: info.length
    };
  }, [fieldResults]);
}