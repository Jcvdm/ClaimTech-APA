'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { EstimateLine } from '@/lib/api/domains/estimates/types';

export interface FieldValidation {
  field: keyof EstimateLine;
  isValid: boolean;
  error?: string;
  warning?: string;
  info?: string;
}

export interface LineValidation {
  lineId: string;
  fields: Record<string, FieldValidation>;
  isValid: boolean;
  hasWarnings: boolean;
  hasInfo: boolean;
}

interface FieldValidationState {
  validations: Map<string, LineValidation>;
  
  // Actions
  setFieldValidation: (lineId: string, field: keyof EstimateLine, validation: FieldValidation) => void;
  clearFieldValidation: (lineId: string, field: keyof EstimateLine) => void;
  clearLineValidation: (lineId: string) => void;
  getLineValidation: (lineId: string) => LineValidation | undefined;
  getFieldValidation: (lineId: string, field: keyof EstimateLine) => FieldValidation | undefined;
  isFieldValid: (lineId: string, field: keyof EstimateLine) => boolean;
  getValidationSummary: () => {
    totalErrors: number;
    totalWarnings: number;
    totalLines: number;
    errorsByLine: Record<string, number>;
  };
  reset: () => void;
}

export const useFieldValidationStore = create<FieldValidationState>()(
  devtools((set, get) => ({
    validations: new Map(),

    setFieldValidation: (lineId, field, validation) => {
      set((state) => {
        const newValidations = new Map(state.validations);
        const lineValidation = newValidations.get(lineId) || {
          lineId,
          fields: {},
          isValid: true,
          hasWarnings: false,
          hasInfo: false,
        };

        lineValidation.fields[field] = validation;
        
        // Recalculate line validation status
        const fieldValidations = Object.values(lineValidation.fields);
        lineValidation.isValid = fieldValidations.every(v => v.isValid);
        lineValidation.hasWarnings = fieldValidations.some(v => !!v.warning);
        lineValidation.hasInfo = fieldValidations.some(v => !!v.info);

        newValidations.set(lineId, lineValidation);
        return { validations: newValidations };
      });
    },

    clearFieldValidation: (lineId, field) => {
      set((state) => {
        const newValidations = new Map(state.validations);
        const lineValidation = newValidations.get(lineId);
        if (lineValidation) {
          delete lineValidation.fields[field];
          
          // Recalculate line validation status
          const fieldValidations = Object.values(lineValidation.fields);
          lineValidation.isValid = fieldValidations.every(v => v.isValid);
          lineValidation.hasWarnings = fieldValidations.some(v => !!v.warning);
          lineValidation.hasInfo = fieldValidations.some(v => !!v.info);
          
          if (Object.keys(lineValidation.fields).length === 0) {
            newValidations.delete(lineId);
          } else {
            newValidations.set(lineId, lineValidation);
          }
        }
        return { validations: newValidations };
      });
    },

    clearLineValidation: (lineId) => {
      set((state) => {
        const newValidations = new Map(state.validations);
        newValidations.delete(lineId);
        return { validations: newValidations };
      });
    },

    getLineValidation: (lineId) => get().validations.get(lineId),

    getFieldValidation: (lineId, field) => {
      const lineValidation = get().validations.get(lineId);
      return lineValidation?.fields[field];
    },

    isFieldValid: (lineId, field) => {
      const lineValidation = get().validations.get(lineId);
      return lineValidation?.fields[field]?.isValid ?? true;
    },

    getValidationSummary: () => {
      const validations = get().validations;
      let totalErrors = 0;
      let totalWarnings = 0;
      let totalLines = validations.size;
      const errorsByLine: Record<string, number> = {};

      validations.forEach((lineValidation, lineId) => {
        let lineErrors = 0;
        Object.values(lineValidation.fields).forEach(field => {
          if (!field.isValid) {
            totalErrors++;
            lineErrors++;
          }
          if (field.warning) {
            totalWarnings++;
          }
        });
        if (lineErrors > 0) {
          errorsByLine[lineId] = lineErrors;
        }
      });

      return {
        totalErrors,
        totalWarnings,
        totalLines,
        errorsByLine,
      };
    },

    reset: () => {
      set({ validations: new Map() });
    },
  }), { name: 'field-validation-store' })
);

// Validation rule types
export interface ValidationRule<T = any> {
  name: string;
  validate: (value: T, line: EstimateLine) => { isValid: boolean; message?: string; severity: 'error' | 'warning' | 'info' };
  severity: 'error' | 'warning' | 'info';
}

// Pre-defined validation rules for common estimate line fields
export const createValidationRules = (): Record<keyof EstimateLine, ValidationRule[]> => ({
  id: [],
  estimate_id: [],
  sequence_number: [
    {
      name: 'positive-number',
      validate: (value: number) => {
        if (value <= 0) {
          return { isValid: false, message: 'Sequence number must be greater than 0', severity: 'error' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'error',
    },
  ],
  operation_code: [],
  description: [
    {
      name: 'not-empty',
      validate: (value: string) => {
        if (!value || value.trim() === '') {
          return { isValid: true, message: 'Consider adding a description for clarity', severity: 'warning' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'warning',
    },
  ],
  part_type: [],
  part_number: [],
  part_cost: [
    {
      name: 'non-negative',
      validate: (value: number | null) => {
        if (value !== null && value < 0) {
          return { isValid: false, message: 'Part cost cannot be negative', severity: 'error' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'error',
    },
    {
      name: 'reasonable-amount',
      validate: (value: number | null) => {
        if (value !== null && value > 50000) {
          return { isValid: true, message: 'Part cost seems unusually high - please verify', severity: 'warning' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'warning',
    },
    {
      name: 'required-for-new-parts',
      validate: (value: number | null, line: EstimateLine) => {
        if (line.operation_code === 'N' && !value) {
          return { isValid: false, message: 'Part cost is required for new parts', severity: 'error' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'error',
    },
  ],
  quantity: [
    {
      name: 'positive-number',
      validate: (value: number) => {
        if (value <= 0) {
          return { isValid: false, message: 'Quantity must be greater than 0', severity: 'error' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'error',
    },
    {
      name: 'reasonable-quantity',
      validate: (value: number) => {
        if (value > 100) {
          return { isValid: true, message: 'Large quantity - please verify', severity: 'warning' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'warning',
    },
  ],
  strip_fit_hours: [
    {
      name: 'non-negative',
      validate: (value: number | null) => {
        if (value !== null && value < 0) {
          return { isValid: false, message: 'Hours cannot be negative', severity: 'error' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'error',
    },
    {
      name: 'reasonable-hours',
      validate: (value: number | null) => {
        if (value !== null && value > 100) {
          return { isValid: true, message: 'Large hour value - please verify', severity: 'warning' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'warning',
    },
  ],
  repair_hours: [
    {
      name: 'non-negative',
      validate: (value: number | null) => {
        if (value !== null && value < 0) {
          return { isValid: false, message: 'Hours cannot be negative', severity: 'error' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'error',
    },
    {
      name: 'reasonable-hours',
      validate: (value: number | null) => {
        if (value !== null && value > 100) {
          return { isValid: true, message: 'Large hour value - please verify', severity: 'warning' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'warning',
    },
  ],
  paint_hours: [
    {
      name: 'non-negative',
      validate: (value: number | null) => {
        if (value !== null && value < 0) {
          return { isValid: false, message: 'Hours cannot be negative', severity: 'error' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'error',
    },
    {
      name: 'reasonable-hours',
      validate: (value: number | null) => {
        if (value !== null && value > 100) {
          return { isValid: true, message: 'Large hour value - please verify', severity: 'warning' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'warning',
    },
  ],
  sublet_cost: [
    {
      name: 'non-negative',
      validate: (value: number | null) => {
        if (value !== null && value < 0) {
          return { isValid: false, message: 'Sublet cost cannot be negative', severity: 'error' };
        }
        return { isValid: true, severity: 'info' };
      },
      severity: 'error',
    },
  ],
  line_notes: [],
  is_included: [],
  created_at: [],
  updated_at: [],
});