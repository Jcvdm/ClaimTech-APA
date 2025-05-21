"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUploadCard } from '@/components/inspection/PhotoUploadCard';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ThreeSixtyViewSectionProps {
  claimId: string;
  inspectionId: string;
  frontViewPhotoPath: string | null;
  rightFrontViewPhotoPath: string | null;
  rightSideViewPhotoPath: string | null;
  rightRearViewPhotoPath: string | null;
  rearViewPhotoPath: string | null;
  leftRearViewPhotoPath: string | null;
  leftSideViewPhotoPath: string | null;
  leftFrontViewPhotoPath: string | null;
  overallCondition: string;
  onFrontViewPhotoPathChange: (path: string | null) => void;
  onRightFrontViewPhotoPathChange: (path: string | null) => void;
  onRightSideViewPhotoPathChange: (path: string | null) => void;
  onRightRearViewPhotoPathChange: (path: string | null) => void;
  onRearViewPhotoPathChange: (path: string | null) => void;
  onLeftRearViewPhotoPathChange: (path: string | null) => void;
  onLeftSideViewPhotoPathChange: (path: string | null) => void;
  onLeftFrontViewPhotoPathChange: (path: string | null) => void;
  onOverallConditionChange: (value: string) => void;
}

export function ThreeSixtyViewSection({
  claimId,
  inspectionId,
  frontViewPhotoPath,
  rightFrontViewPhotoPath,
  rightSideViewPhotoPath,
  rightRearViewPhotoPath,
  rearViewPhotoPath,
  leftRearViewPhotoPath,
  leftSideViewPhotoPath,
  leftFrontViewPhotoPath,
  overallCondition,
  onFrontViewPhotoPathChange,
  onRightFrontViewPhotoPathChange,
  onRightSideViewPhotoPathChange,
  onRightRearViewPhotoPathChange,
  onRearViewPhotoPathChange,
  onLeftRearViewPhotoPathChange,
  onLeftSideViewPhotoPathChange,
  onLeftFrontViewPhotoPathChange,
  onOverallConditionChange
}: ThreeSixtyViewSectionProps) {
  // Calculate the number of completed photos
  const photos = [
    frontViewPhotoPath,
    rightFrontViewPhotoPath,
    rightSideViewPhotoPath,
    rightRearViewPhotoPath,
    rearViewPhotoPath,
    leftRearViewPhotoPath,
    leftSideViewPhotoPath,
    leftFrontViewPhotoPath
  ];

  const completedPhotos = photos.filter(Boolean).length;

  // Calculate completion status including overall condition
  const totalItems = 9; // 8 photos + overall condition
  let completedItems = completedPhotos + (overallCondition ? 1 : 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>360° Vehicle View</CardTitle>
          <Badge variant={completedItems === totalItems ? "success" : "outline"}>
            {completedItems} of {totalItems} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {/* First row of photos */}
          <div className="space-y-2 h-44 text-center">
            <Label className="text-center">Front View</Label>
            <div className="h-36">
              <PhotoUploadCard
              title="Front View"
              description="Front of the vehicle"
              imagePath={frontViewPhotoPath}
              onImagePathChange={onFrontViewPhotoPathChange}
              uploadPath={`claims/${claimId}/inspections/${inspectionId}/360-view/front`}
            />
            </div>
          </div>

          <div className="space-y-2 h-44 text-center">
            <Label className="text-center">Right Front View</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Right Front View"
                description="Front right corner"
                imagePath={rightFrontViewPhotoPath}
                onImagePathChange={onRightFrontViewPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/360-view/right-front`}
              />
            </div>
          </div>

          <div className="space-y-2 h-44 text-center">
            <Label className="text-center">Right Side View</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Right Side View"
                description="Right side of the vehicle"
                imagePath={rightSideViewPhotoPath}
                onImagePathChange={onRightSideViewPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/360-view/right-side`}
              />
            </div>
          </div>

          <div className="space-y-2 h-44 text-center">
            <Label className="text-center">Right Rear View</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Right Rear View"
                description="Rear right corner"
                imagePath={rightRearViewPhotoPath}
                onImagePathChange={onRightRearViewPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/360-view/right-rear`}
              />
            </div>
          </div>

          {/* Second row of photos */}
          <div className="space-y-2 h-44 text-center">
            <Label className="text-center">Rear View</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Rear View"
                description="Back of the vehicle"
                imagePath={rearViewPhotoPath}
                onImagePathChange={onRearViewPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/360-view/rear`}
              />
            </div>
          </div>

          <div className="space-y-2 h-44 text-center">
            <Label className="text-center">Left Rear View</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Left Rear View"
                description="Rear left corner"
                imagePath={leftRearViewPhotoPath}
                onImagePathChange={onLeftRearViewPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/360-view/left-rear`}
              />
            </div>
          </div>

          <div className="space-y-2 h-44 text-center">
            <Label className="text-center">Left Side View</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Left Side View"
                description="Left side of the vehicle"
                imagePath={leftSideViewPhotoPath}
                onImagePathChange={onLeftSideViewPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/360-view/left-side`}
              />
            </div>
          </div>

          <div className="space-y-2 h-44 text-center">
            <Label className="text-center">Left Front View</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Left Front View"
                description="Front left corner"
                imagePath={leftFrontViewPhotoPath}
                onImagePathChange={onLeftFrontViewPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/360-view/left-front`}
              />
            </div>
          </div>
        </div>

        {/* Overall Vehicle Condition */}
        <div className="mt-6">
          <div className="space-y-2 max-w-md mx-auto">
            <Label className="text-center block">Overall Vehicle Condition</Label>
            <Select value={overallCondition} onValueChange={onOverallConditionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select overall condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="excellent" value="excellent">Excellent</SelectItem>
                <SelectItem key="good" value="good">Good</SelectItem>
                <SelectItem key="fair" value="fair">Fair</SelectItem>
                <SelectItem key="poor" value="poor">Poor</SelectItem>
                <SelectItem key="very_poor" value="very_poor">Very Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
