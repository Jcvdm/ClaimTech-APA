'use client';

import React from 'react';
import { EditableCell } from './EditableCell';

const OPERATION_CODES = [
  { value: 'RR', label: 'R&R - Remove & Replace' },
  { value: 'REPAIR', label: 'REPAIR - Repair' },
  { value: 'PAINT', label: 'PAINT - Paint' },
  { value: 'REC', label: 'REC - Recondition' },
  { value: 'REF', label: 'REF - Refinish' },
  { value: 'SC', label: 'SC - Special Service' },
  { value: 'ALIGN', label: 'ALIGN - Alignment' },
  { value: 'ADJ', label: 'ADJ - Adjust' },
  { value: 'INST', label: 'INST - Install' },
  { value: 'SUSP', label: 'SUSP - Suspension' },
  { value: 'ELEC', label: 'ELEC - Electrical' },
  { value: 'AC', label: 'AC - Air Conditioning' },
  { value: 'GLASS', label: 'GLASS - Glass' },
  { value: 'MISC', label: 'MISC - Miscellaneous' }
];

interface OperationCodeCellProps {
  value: string | null;
  disabled?: boolean;
  readonly?: boolean;
  onValueChange: (value: string | null) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function OperationCodeCell({
  value,
  disabled = false,
  readonly = false,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown
}: OperationCodeCellProps) {
  return (
    <EditableCell
      type="select"
      value={value}
      options={OPERATION_CODES}
      placeholder="Select operation..."
      disabled={disabled}
      readonly={readonly}
      onValueChange={onValueChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      validation={{
        required: false
      }}
      className="font-mono text-xs"
    />
  );
}