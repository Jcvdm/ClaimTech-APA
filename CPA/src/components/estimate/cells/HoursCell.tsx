'use client';

import React from 'react';
import { EditableCell } from './EditableCell';

interface HoursCellProps {
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

export function HoursCell({
  value,
  disabled = false,
  readonly = false,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown,
  min = 0,
  max = 999.9,
  required = false
}: HoursCellProps) {
  return (
    <EditableCell
      type="hours"
      value={value}
      placeholder="0.0"
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
        message: `Hours must be between ${min} and ${max}`
      }}
      className="text-right"
    />
  );
}