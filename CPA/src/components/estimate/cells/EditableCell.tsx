'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useSmartDebounce } from '@/hooks/useSmartDebounce';
import { cn } from '@/lib/utils';

export type CellType = 'text' | 'number' | 'currency' | 'hours' | 'select';

interface EditableCellProps {
  value: string | number | null;
  type?: CellType;
  options?: { value: string; label: string; }[];
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  className?: string;
  onValueChange: (value: string | number | null) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

export function EditableCell({
  value,
  type = 'text',
  options = [],
  placeholder,
  disabled = false,
  readonly = false,
  className,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown,
  validation
}: EditableCellProps) {
  const [internalValue, setInternalValue] = useState(value?.toString() || '');
  const [isEditing, setIsEditing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Smart debouncing based on field type
  const debounceLevel = type === 'currency' || type === 'number' ? 'critical' : 'standard';
  const debouncedValue = useSmartDebounce(internalValue, debounceLevel);

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value?.toString() || '');
  }, [value]);

  // Handle debounced value changes
  useEffect(() => {
    if (debouncedValue !== value?.toString() && isEditing) {
      const processedValue = processValue(debouncedValue);
      if (validateValue(processedValue)) {
        onValueChange(processedValue);
      }
    }
  }, [debouncedValue, value, isEditing, onValueChange]);

  const processValue = (val: string): string | number | null => {
    if (!val || val.trim() === '') return null;
    
    switch (type) {
      case 'number':
      case 'currency':
      case 'hours':
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      case 'text':
      case 'select':
      default:
        return val.trim();
    }
  };

  const validateValue = (val: string | number | null): boolean => {
    if (!validation) return true;

    // Required check
    if (validation.required && (val === null || val === '')) {
      setHasError(true);
      setErrorMessage('This field is required');
      return false;
    }

    // Numeric validations
    if (typeof val === 'number') {
      if (validation.min !== undefined && val < validation.min) {
        setHasError(true);
        setErrorMessage(`Value must be at least ${validation.min}`);
        return false;
      }
      if (validation.max !== undefined && val > validation.max) {
        setHasError(true);
        setErrorMessage(`Value must not exceed ${validation.max}`);
        return false;
      }
    }

    // Pattern validation
    if (validation.pattern && typeof val === 'string' && !validation.pattern.test(val)) {
      setHasError(true);
      setErrorMessage(validation.message || 'Invalid format');
      return false;
    }

    setHasError(false);
    setErrorMessage('');
    return true;
  };

  const formatDisplayValue = (val: string | number | null): string => {
    if (val === null || val === undefined) return '';
    
    switch (type) {
      case 'currency':
        return typeof val === 'number' ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(val) : val.toString();
      case 'number':
        return typeof val === 'number' ? val.toLocaleString() : val.toString();
      case 'hours':
        return typeof val === 'number' ? val.toFixed(1) : val.toString();
      default:
        return val.toString();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(true);
    if (type === 'currency' || type === 'number') {
      // Show raw number for editing
      const numericValue = typeof value === 'number' ? value.toString() : value?.toString() || '';
      setInternalValue(numericValue);
    }
    onFocus?.();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(false);
    // Format for display
    setInternalValue(formatDisplayValue(value));
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle special keys
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setInternalValue(value?.toString() || '');
      e.currentTarget.blur();
    }
    onKeyDown?.(e);
  };

  const handleDoubleClick = () => {
    if (!readonly && !disabled) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  if (type === 'select' && options.length > 0) {
    return (
      <select
        value={internalValue}
        onChange={(e) => {
          setInternalValue(e.target.value);
          onValueChange(e.target.value || null);
        }}
        disabled={disabled || readonly}
        className={cn(
          'w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
          hasError && 'border-red-500 focus:ring-red-500 focus:border-red-500',
          disabled && 'bg-gray-100 cursor-not-allowed',
          readonly && 'bg-gray-50 cursor-default',
          className
        )}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      >
        <option value="">Select...</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type={type === 'number' || type === 'currency' || type === 'hours' ? 'number' : 'text'}
        value={internalValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readonly}
        className={cn(
          'text-sm',
          hasError && 'border-red-500 focus:ring-red-500 focus:border-red-500',
          readonly && 'cursor-default',
          className
        )}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        step={type === 'currency' ? '0.01' : type === 'hours' ? '0.1' : undefined}
      />
      
      {hasError && errorMessage && (
        <div className="absolute z-10 mt-1 p-1 bg-red-100 border border-red-300 rounded text-xs text-red-700 whitespace-nowrap">
          {errorMessage}
        </div>
      )}
    </div>
  );
}