'use client';

import { useState, useCallback, useRef } from 'react';
import { enhancedToast } from '@/components/ui/enhanced-toast';

interface ValidationRule<T = any> {
  name: string;
  validator: (value: T) => boolean | string;
  message?: string;
  severity?: 'error' | 'warning' | 'info';
  blockSave?: boolean; // Whether this validation error should block save operations
}

interface FieldValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  hasBlockingErrors: boolean;
}

interface ValidationOptions {
  showToasts?: boolean;
  debounceMs?: number;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  gracefulDegradation?: boolean; // Allow operations to continue with warnings
}

/**
 * Hook for comprehensive field validation with graceful degradation
 */
export function useFieldValidation<T = any>(
  fieldName: string,
  rules: ValidationRule<T>[] = [],
  options: ValidationOptions = {}
) {
  const {
    showToasts = true,
    debounceMs = 300,
    validateOnChange = true,
    validateOnBlur = true,
    gracefulDegradation = true,
  } = options;

  const [validationState, setValidationState] = useState<FieldValidationState>({
    isValid: true,
    errors: [],
    warnings: [],
    info: [],
    hasBlockingErrors: false,
  });

  const [isValidating, setIsValidating] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastValidatedValue = useRef<T>();

  // Built-in validation rules
  const builtInRules = {
    required: (message = 'This field is required'): ValidationRule<T> => ({
      name: 'required',
      validator: (value) => {
        if (value === null || value === undefined || value === '') {
          return false;
        }
        if (typeof value === 'string' && value.trim() === '') {
          return false;
        }
        if (Array.isArray(value) && value.length === 0) {
          return false;
        }
        return true;
      },
      message,
      severity: 'error',
      blockSave: true,
    }),

    minLength: (min: number, message?: string): ValidationRule<string> => ({
      name: 'minLength',
      validator: (value) => {
        if (typeof value !== 'string') return true;
        return value.length >= min;
      },
      message: message || `Must be at least ${min} characters`,
      severity: 'error',
      blockSave: true,
    }),

    maxLength: (max: number, message?: string): ValidationRule<string> => ({
      name: 'maxLength',
      validator: (value) => {
        if (typeof value !== 'string') return true;
        return value.length <= max;
      },
      message: message || `Must be no more than ${max} characters`,
      severity: 'error',
      blockSave: true,
    }),

    numeric: (message = 'Must be a valid number'): ValidationRule<any> => ({
      name: 'numeric',
      validator: (value) => {
        if (value === null || value === undefined || value === '') return true;
        const num = Number(value);
        return !isNaN(num) && isFinite(num);
      },
      message,
      severity: 'error',
      blockSave: true,
    }),

    positiveNumber: (message = 'Must be a positive number'): ValidationRule<number> => ({
      name: 'positiveNumber',
      validator: (value) => {
        if (value === null || value === undefined) return true;
        const num = Number(value);
        return !isNaN(num) && num > 0;
      },
      message,
      severity: 'error',
      blockSave: true,
    }),

    nonNegativeNumber: (message = 'Must be zero or greater'): ValidationRule<number> => ({
      name: 'nonNegativeNumber',
      validator: (value) => {
        if (value === null || value === undefined) return true;
        const num = Number(value);
        return !isNaN(num) && num >= 0;
      },
      message,
      severity: 'warning',
      blockSave: false,
    }),

    email: (message = 'Must be a valid email address'): ValidationRule<string> => ({
      name: 'email',
      validator: (value) => {
        if (!value) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      message,
      severity: 'error',
      blockSave: true,
    }),

    pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
      name: 'pattern',
      validator: (value) => {
        if (!value) return true;
        return regex.test(value);
      },
      message,
      severity: 'error',
      blockSave: true,
    }),

    // Business logic validations
    reasonablePrice: (message = 'Price seems unusually high'): ValidationRule<number> => ({
      name: 'reasonablePrice',
      validator: (value) => {
        if (value === null || value === undefined) return true;
        const num = Number(value);
        return isNaN(num) || num < 10000; // Flag prices over $10k as suspicious
      },
      message,
      severity: 'warning',
      blockSave: false,
    }),

    reasonableQuantity: (message = 'Quantity seems unusually high'): ValidationRule<number> => ({
      name: 'reasonableQuantity',
      validator: (value) => {
        if (value === null || value === undefined) return true;
        const num = Number(value);
        return isNaN(num) || num <= 100; // Flag quantities over 100 as suspicious
      },
      message,
      severity: 'warning',
      blockSave: false,
    }),
  };

  // Validate a value against all rules
  const validateValue = useCallback((value: T): FieldValidationState => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];
    let hasBlockingErrors = false;

    for (const rule of rules) {
      try {
        const result = rule.validator(value);
        
        if (result !== true) {
          const message = typeof result === 'string' ? result : (rule.message || 'Validation failed');
          const severity = rule.severity || 'error';
          
          switch (severity) {
            case 'error':
              errors.push(message);
              if (rule.blockSave !== false) {
                hasBlockingErrors = true;
              }
              break;
            case 'warning':
              warnings.push(message);
              break;
            case 'info':
              info.push(message);
              break;
          }
        }
      } catch (error) {
        console.error(`[useFieldValidation] Error in validation rule ${rule.name}:`, error);
        errors.push('Validation error occurred');
        hasBlockingErrors = true;
      }
    }

    const isValid = errors.length === 0 && (gracefulDegradation || warnings.length === 0);

    return {
      isValid,
      errors,
      warnings,
      info,
      hasBlockingErrors,
    };
  }, [rules, gracefulDegradation]);

  // Debounced validation
  const debouncedValidate = useCallback((value: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setIsValidating(true);
      
      try {
        const result = validateValue(value);
        setValidationState(result);
        lastValidatedValue.current = value;

        // Show toasts for validation errors if enabled
        if (showToasts) {
          if (result.errors.length > 0) {
            enhancedToast.validationError(`${fieldName}: ${result.errors[0]}`, {
              field: fieldName,
              value: value,
              helpText: result.errors.length > 1 ? `${result.errors.length} validation errors found` : undefined,
            });
          } else if (result.warnings.length > 0 && !gracefulDegradation) {
            enhancedToast.warning(`${fieldName}: ${result.warnings[0]}`, {
              description: result.warnings.length > 1 ? `${result.warnings.length} warnings found` : undefined,
            });
          }
        }
      } catch (error) {
        console.error(`[useFieldValidation] Validation error for ${fieldName}:`, error);
        setValidationState({
          isValid: false,
          errors: ['Validation system error'],
          warnings: [],
          info: [],
          hasBlockingErrors: true,
        });
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);
  }, [validateValue, fieldName, showToasts, gracefulDegradation, debounceMs]);

  // Immediate validation (no debounce)
  const validateImmediately = useCallback((value: T): FieldValidationState => {
    setIsValidating(true);
    
    try {
      const result = validateValue(value);
      setValidationState(result);
      lastValidatedValue.current = value;
      return result;
    } catch (error) {
      console.error(`[useFieldValidation] Immediate validation error for ${fieldName}:`, error);
      const errorState = {
        isValid: false,
        errors: ['Validation system error'],
        warnings: [],
        info: [],
        hasBlockingErrors: true,
      };
      setValidationState(errorState);
      return errorState;
    } finally {
      setIsValidating(false);
    }
  }, [validateValue, fieldName]);

  // Handle field change
  const handleChange = useCallback((value: T) => {
    if (validateOnChange) {
      debouncedValidate(value);
    }
  }, [validateOnChange, debouncedValidate]);

  // Handle field blur
  const handleBlur = useCallback((value: T) => {
    if (validateOnBlur) {
      // Cancel any pending debounced validation and validate immediately
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      validateImmediately(value);
    }
  }, [validateOnBlur, validateImmediately]);

  // Check if value can be saved (no blocking errors)
  const canSave = useCallback((value?: T): boolean => {
    if (value !== undefined && value !== lastValidatedValue.current) {
      const result = validateValue(value);
      return !result.hasBlockingErrors;
    }
    return !validationState.hasBlockingErrors;
  }, [validateValue, validationState.hasBlockingErrors]);

  // Get validation CSS classes
  const getValidationClasses = useCallback(() => {
    if (validationState.errors.length > 0) {
      return 'border-red-500 focus:border-red-500 focus:ring-red-500';
    }
    if (validationState.warnings.length > 0) {
      return 'border-amber-500 focus:border-amber-500 focus:ring-amber-500';
    }
    if (validationState.isValid && lastValidatedValue.current !== undefined) {
      return 'border-green-500 focus:border-green-500 focus:ring-green-500';
    }
    return '';
  }, [validationState]);

  // Clear validation state
  const clearValidation = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setValidationState({
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      hasBlockingErrors: false,
    });
    lastValidatedValue.current = undefined;
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  return {
    // State
    validationState,
    isValidating,
    
    // Actions
    handleChange,
    handleBlur,
    validateImmediately,
    canSave,
    clearValidation,
    cleanup,
    
    // Utilities
    getValidationClasses,
    builtInRules,
    
    // Direct validation
    validate: validateValue,
  };
}