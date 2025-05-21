"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PhotoUploadCard } from '@/components/inspection/PhotoUploadCard';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface MechanicalSectionProps {
  claimId: string;
  inspectionId: string;
  engineBayPhotoPath: string | null;
  batteryPhotoPath: string | null;
  mechanicalCondition: string;
  electricalCondition: string;
  onEngineBayPhotoPathChange: (path: string | null) => void;
  onBatteryPhotoPathChange: (path: string | null) => void;
  onMechanicalConditionChange: (value: string) => void;
  onElectricalConditionChange: (value: string) => void;
}

export function MechanicalSection({
  claimId,
  inspectionId,
  engineBayPhotoPath,
  batteryPhotoPath,
  mechanicalCondition,
  electricalCondition,
  onEngineBayPhotoPathChange,
  onBatteryPhotoPathChange,
  onMechanicalConditionChange,
  onElectricalConditionChange
}: MechanicalSectionProps) {
  // Calculate completion status
  const totalItems = 4;
  let completedItems = 0;

  if (engineBayPhotoPath) completedItems++;
  if (batteryPhotoPath) completedItems++;
  if (mechanicalCondition) completedItems++;
  if (electricalCondition) completedItems++;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Mechanical</CardTitle>
          <Badge variant={completedItems === totalItems ? "success" : "outline"}>
            {completedItems} of {totalItems} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Engine Bay and Battery Photos - Side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 text-center">
            <Label className="text-center">Engine Bay</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Engine Bay"
                description="Photo of the engine bay"
                imagePath={engineBayPhotoPath}
                onImagePathChange={onEngineBayPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/mechanical/engine-bay`}
                size="small"
              />
            </div>
          </div>

          <div className="space-y-2 text-center">
            <Label className="text-center">Battery</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Battery"
                description="Photo of the battery"
                imagePath={batteryPhotoPath}
                onImagePathChange={onBatteryPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/mechanical/battery`}
                size="small"
              />
            </div>
          </div>
        </div>

        {/* Mechanical and Electrical Condition - Side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Mechanical Condition</Label>
            <Select value={mechanicalCondition} onValueChange={onMechanicalConditionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="working">Working</SelectItem>
                <SelectItem value="not_working">Not Working</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Electrical Condition</Label>
            <Select value={electricalCondition} onValueChange={onElectricalConditionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="working">Working</SelectItem>
                <SelectItem value="not_working">Not Working</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
