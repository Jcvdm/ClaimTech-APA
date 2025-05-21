"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUploadCard } from '@/components/inspection/PhotoUploadCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RegistrationSectionProps {
  claimId: string;
  inspectionId: string;
  registrationNumber: string | null;
  registrationPhotoPath: string | null;
  onRegistrationNumberChange: (registrationNumber: string) => void;
  onRegistrationPhotoPathChange: (path: string | null) => void;
}

export function RegistrationSection({
  claimId,
  inspectionId,
  registrationNumber,
  registrationPhotoPath,
  onRegistrationNumberChange,
  onRegistrationPhotoPathChange
}: RegistrationSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Registration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {/* Registration Input - spans 2 columns */}
          <div className="col-span-2 space-y-2">
            <Label htmlFor="registrationNumber">Registration Number</Label>
            <Input
              id="registrationNumber"
              value={registrationNumber || ''}
              onChange={(e) => onRegistrationNumberChange(e.target.value)}
              placeholder="Enter the vehicle's registration number"
              className="font-mono w-full"
            />
          </div>

          {/* Registration Photo - spans 2 columns */}
          <div className="col-span-2 space-y-2 h-44">
            <Label>Registration Document</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Registration Document"
                description="Photo of the vehicle's registration document"
                imagePath={registrationPhotoPath}
                onImagePathChange={onRegistrationPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/registration`}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
