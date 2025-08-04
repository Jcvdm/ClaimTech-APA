'use client';

import React from 'react';
import { EditableCell } from './EditableCell';

interface CurrencyCellProps {
  value: number | null;
  disabled?: boolean;
  readonly?: boolean;
  onValueChange: (value: number | null) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  min?: number;
  max?: number;
  required?: boolean;
}

export function CurrencyCell({
  value,
  disabled = false,
  readonly = false,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown,
  min = 0,
  max = 999999.99,
  required = false
}: CurrencyCellProps) {
  return (
    <EditableCell
      type="currency"
      value={value}
      placeholder="$0.00"
      disabled={disabled}
      readonly={readonly}
      onValueChange={onValueChange as (value: string | number | null) => void}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      validation={{
        required,
        min,
        max,
        message: `Amount must be between $${min.toFixed(2)} and $${max.toFixed(2)}`
      }}
      className="text-right"
    />
  );
}