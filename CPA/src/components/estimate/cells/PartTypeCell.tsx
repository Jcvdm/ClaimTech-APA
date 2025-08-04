'use client';

import React from 'react';
import { EditableCell } from './EditableCell';

const PART_TYPES = [
  { value: 'OEM', label: 'OEM - Original Equipment' },
  { value: 'AM', label: 'AM - Aftermarket' },
  { value: 'USED', label: 'USED - Used Part' },
  { value: 'REC', label: 'REC - Reconditioned' },
  { value: 'REPL', label: 'REPL - Replacement' },
  { value: 'SUPP', label: 'SUPP - Supplies' },
  { value: 'SUBLET', label: 'SUBLET - Sublet' },
  { value: 'LABOR', label: 'LABOR - Labor Only' },
  { value: 'MISC', label: 'MISC - Miscellaneous' }
];

interface PartTypeCellProps {
  value: string | null;
  disabled?: boolean;
  readonly?: boolean;
  onValueChange: (value: string | null) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function PartTypeCell({
  value,
  disabled = false,
  readonly = false,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown
}: PartTypeCellProps) {
  return (
    <EditableCell
      type="select"
      value={value}
      options={PART_TYPES}
      placeholder="Select type..."
      disabled={disabled}
      readonly={readonly}
      onValueChange={onValueChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      validation={{
        required: false
      }}
      className="text-xs"
    />
  );
}