"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PhotoUploadCard } from '@/components/inspection/PhotoUploadCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TyreSingleProps {
  title: string;
  claimId: string;
  inspectionId: string;
  position: string;
  facePhotoPath: string | null;
  measurementPhotoPath: string | null;
  treadPhotoPath: string | null;
  make: string;
  size: string;
  loadSpeed: string;
  onFacePhotoPathChange: (path: string | null) => void;
  onMeasurementPhotoPathChange: (path: string | null) => void;
  onTreadPhotoPathChange: (path: string | null) => void;
  onMakeChange: (value: string) => void;
  onSizeChange: (value: string) => void;
  onLoadSpeedChange: (value: string) => void;
}

export function TyreSingle({
  title,
  claimId,
  inspectionId,
  position,
  facePhotoPath,
  measurementPhotoPath,
  treadPhotoPath,
  make,
  size,
  loadSpeed,
  onFacePhotoPathChange,
  onMeasurementPhotoPathChange,
  onTreadPhotoPathChange,
  onMakeChange,
  onSizeChange,
  onLoadSpeedChange
}: TyreSingleProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Photos - 3 in a row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 text-center">
              <Label className="text-center">Face</Label>
              <div className="h-28">
                <PhotoUploadCard
                  title="Face"
                  description="Front view of tyre"
                  imagePath={facePhotoPath}
                  onImagePathChange={onFacePhotoPathChange}
                  uploadPath={`claims/${claimId}/inspections/${inspectionId}/tyres/${position}/face`}
                  size="small"
                />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <Label className="text-center">Measurement</Label>
              <div className="h-28">
                <PhotoUploadCard
                  title="Measurement"
                  description="Tyre size measurement"
                  imagePath={measurementPhotoPath}
                  onImagePathChange={onMeasurementPhotoPathChange}
                  uploadPath={`claims/${claimId}/inspections/${inspectionId}/tyres/${position}/measurement`}
                  size="small"
                />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <Label className="text-center">Tread</Label>
              <div className="h-28">
                <PhotoUploadCard
                  title="Tread"
                  description="Tyre tread condition"
                  imagePath={treadPhotoPath}
                  onImagePathChange={onTreadPhotoPathChange}
                  uploadPath={`claims/${claimId}/inspections/${inspectionId}/tyres/${position}/tread`}
                  size="small"
                />
              </div>
            </div>
          </div>

          {/* Details - 3 in a row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${position}-make`}>Make</Label>
              <Input
                id={`${position}-make`}
                placeholder="Tyre make"
                value={make}
                onChange={(e) => onMakeChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${position}-size`}>Size</Label>
              <Input
                id={`${position}-size`}
                placeholder="e.g., 205/55R16"
                value={size}
                onChange={(e) => onSizeChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${position}-load-speed`}>Load/Speed</Label>
              <Input
                id={`${position}-load-speed`}
                placeholder="e.g., 91V"
                value={loadSpeed}
                onChange={(e) => onLoadSpeedChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
