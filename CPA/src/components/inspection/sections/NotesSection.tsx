"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/inspection/RichTextEditor';

interface NotesSectionProps {
  notes: string | null;
  onNotesChange: (notes: string) => void;
  onSubmit?: () => void;
}

export function NotesSection({
  notes,
  onNotesChange,
  onSubmit
}: NotesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <RichTextEditor
            content={notes || ''}
            onChange={onNotesChange}
            onSubmit={onSubmit}
            placeholder="Enter notes about the vehicle inspection"
          />
        </div>
      </CardContent>
    </Card>
  );
}
