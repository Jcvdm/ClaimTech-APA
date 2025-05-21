"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUploadCard } from '@/components/inspection/PhotoUploadCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VinSectionProps {
  claimId: string;
  inspectionId: string;
  vehicleId: string;
  vin: string | null;
  vinDashPhotoPath: string | null;
  vinPlatePhotoPath: string | null;
  vinNumberPhotoPath: string | null;
  onVinChange: (vin: string) => void;
  onVinDashPhotoPathChange: (path: string | null) => void;
  onVinPlatePhotoPathChange: (path: string | null) => void;
  onVinNumberPhotoPathChange: (path: string | null) => void;
}

export function VinSection({
  claimId,
  inspectionId,
  vehicleId,
  vin,
  vinDashPhotoPath,
  vinPlatePhotoPath,
  vinNumberPhotoPath,
  onVinChange,
  onVinDashPhotoPathChange,
  onVinPlatePhotoPathChange,
  onVinNumberPhotoPathChange
}: VinSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Identification Number (VIN)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {/* VIN Input - spans 2 columns */}
          <div className="col-span-2 space-y-2">
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              value={vin || ''}
              onChange={(e) => onVinChange(e.target.value)}
              placeholder="Enter the vehicle's VIN"
              className="font-mono w-full"
            />
          </div>

          {/* VIN Photos - each in a single column */}
          <div className="space-y-2 h-44">
            <Label>VIN Number Photo</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="VIN Number Photo"
                description="Close-up of VIN number"
                imagePath={vinNumberPhotoPath}
                onImagePathChange={onVinNumberPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/vin/number`}
              />
            </div>
          </div>

          <div className="space-y-2 h-44">
            <Label>VIN Plate Photo</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="VIN Plate Photo"
                description="Photo of VIN plate"
                imagePath={vinPlatePhotoPath}
                onImagePathChange={onVinPlatePhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/vin/plate`}
              />
            </div>
          </div>

          {/* Additional VIN photo in a new row */}
          <div className="col-span-1 col-start-3 space-y-2 h-44">
            <Label>VIN Dash Photo</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="VIN Dash Photo"
                description="Photo of VIN on dashboard"
                imagePath={vinDashPhotoPath}
                onImagePathChange={onVinDashPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/vin/dash`}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
