"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PhotoUploadCard } from '@/components/inspection/PhotoUploadCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface InteriorSectionProps {
  claimId: string;
  inspectionId: string;
  mileagePhotoPath: string | null;
  radioPresent: boolean;
  radioMake: string;
  radioModel: string;
  radioPhotoPath: string | null;
  gearType: string;
  interiorFrontPhotoPath: string | null;
  interiorRearPhotoPath: string | null;
  leatherSeats: boolean;
  interiorCondition: string;
  srsActivated: boolean;
  srsDamagePhotoPath1: string | null;
  srsDamagePhotoPath2: string | null;
  srsDamagePhotoPath3: string | null;
  srsDamagePhotoPath4: string | null;
  jackToolsPresent: boolean;
  jackToolsPhotoPath: string | null;
  onMileagePhotoPathChange: (path: string | null) => void;
  onRadioPresentChange: (value: boolean) => void;
  onRadioMakeChange: (value: string) => void;
  onRadioModelChange: (value: string) => void;
  onRadioPhotoPathChange: (path: string | null) => void;
  onGearTypeChange: (value: string) => void;
  onInteriorFrontPhotoPathChange: (path: string | null) => void;
  onInteriorRearPhotoPathChange: (path: string | null) => void;
  onLeatherSeatsChange: (value: boolean) => void;
  onInteriorConditionChange: (value: string) => void;
  onSrsActivatedChange: (value: boolean) => void;
  onSrsDamagePhotoPath1Change: (path: string | null) => void;
  onSrsDamagePhotoPath2Change: (path: string | null) => void;
  onSrsDamagePhotoPath3Change: (path: string | null) => void;
  onSrsDamagePhotoPath4Change: (path: string | null) => void;
  onJackToolsPresentChange: (value: boolean) => void;
  onJackToolsPhotoPathChange: (path: string | null) => void;
}

export function InteriorSection({
  claimId,
  inspectionId,
  mileagePhotoPath,
  radioPresent,
  radioMake,
  radioModel,
  radioPhotoPath,
  gearType,
  interiorFrontPhotoPath,
  interiorRearPhotoPath,
  leatherSeats,
  interiorCondition,
  srsActivated,
  srsDamagePhotoPath1,
  srsDamagePhotoPath2,
  srsDamagePhotoPath3,
  srsDamagePhotoPath4,
  jackToolsPresent,
  jackToolsPhotoPath,
  onMileagePhotoPathChange,
  onRadioPresentChange,
  onRadioMakeChange,
  onRadioModelChange,
  onRadioPhotoPathChange,
  onGearTypeChange,
  onInteriorFrontPhotoPathChange,
  onInteriorRearPhotoPathChange,
  onLeatherSeatsChange,
  onInteriorConditionChange,
  onSrsActivatedChange,
  onSrsDamagePhotoPath1Change,
  onSrsDamagePhotoPath2Change,
  onSrsDamagePhotoPath3Change,
  onSrsDamagePhotoPath4Change,
  onJackToolsPresentChange,
  onJackToolsPhotoPathChange
}: InteriorSectionProps) {
  // Calculate completion status
  const totalItems = 9; // Base items excluding conditional ones
  let completedItems = 0;

  if (mileagePhotoPath) completedItems++;
  if (interiorFrontPhotoPath) completedItems++;
  if (interiorRearPhotoPath) completedItems++;
  if (interiorCondition) completedItems++;

  // Count switches as completed regardless of value
  completedItems += 3; // leatherSeats, jackToolsPresent, radioPresent

  // Radio details
  if (radioPresent) {
    if (radioMake && radioModel && radioPhotoPath) completedItems++;
  } else {
    completedItems++; // If radio not present, count as completed
  }

  // Add conditional items
  if (srsActivated) {
    const srsDamagePhotos = [srsDamagePhotoPath1, srsDamagePhotoPath2, srsDamagePhotoPath3, srsDamagePhotoPath4].filter(Boolean).length;
    if (srsDamagePhotos > 0) completedItems++;
  }

  if (jackToolsPresent && jackToolsPhotoPath) completedItems++;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Interior</CardTitle>
          <Badge variant={completedItems === totalItems ? "success" : "outline"}>
            {completedItems} of {totalItems} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Interior Photos - Mileage, Front, Rear in one row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 text-center">
            <Label className="text-center">Mileage Reading</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Mileage Reading"
                description="Photo of the odometer/mileage display"
                imagePath={mileagePhotoPath}
                onImagePathChange={onMileagePhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/interior/mileage`}
                size="small"
              />
            </div>
          </div>

          <div className="space-y-2 text-center">
            <Label className="text-center">Interior Front</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Interior Front"
                description="Photo of the front interior"
                imagePath={interiorFrontPhotoPath}
                onImagePathChange={onInteriorFrontPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/interior/front`}
                size="small"
              />
            </div>
          </div>

          <div className="space-y-2 text-center">
            <Label className="text-center">Interior Rear</Label>
            <div className="h-36">
              <PhotoUploadCard
                title="Interior Rear"
                description="Photo of the rear interior"
                imagePath={interiorRearPhotoPath}
                onImagePathChange={onInteriorRearPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/interior/rear`}
                size="small"
              />
            </div>
          </div>
        </div>

        {/* Radio Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={radioPresent}
              onCheckedChange={onRadioPresentChange}
            />
            <Label>Radio Present</Label>
          </div>

          {radioPresent && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="radioMake">Radio Make</Label>
                <Input
                  id="radioMake"
                  value={radioMake}
                  onChange={(e) => onRadioMakeChange(e.target.value)}
                  placeholder="Enter radio make"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="radioModel">Radio Model</Label>
                <Input
                  id="radioModel"
                  value={radioModel}
                  onChange={(e) => onRadioModelChange(e.target.value)}
                  placeholder="Enter radio model"
                />
              </div>

              <div className="space-y-2 text-center">
                <Label className="text-center">Radio Photo</Label>
                <div className="h-24">
                  <PhotoUploadCard
                    title="Radio"
                    description="Photo of the radio"
                    imagePath={radioPhotoPath}
                    onImagePathChange={onRadioPhotoPathChange}
                    uploadPath={`claims/${claimId}/inspections/${inspectionId}/interior/radio`}
                    size="small"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gear Type */}
        <div className="space-y-2">
          <Label>Gear Type</Label>
          <Select value={gearType} onValueChange={onGearTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select gear type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="manual" value="manual">Manual</SelectItem>
              <SelectItem key="automatic" value="automatic">Automatic</SelectItem>
              <SelectItem key="other" value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Interior Condition */}
        <div className="space-y-2">
          <Label>Interior Condition</Label>
          <Select value={interiorCondition} onValueChange={onInteriorConditionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select interior condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="no_damage" value="no_damage">NO damage</SelectItem>
              <SelectItem key="good" value="good">Good</SelectItem>
              <SelectItem key="poor" value="poor">Poor</SelectItem>
              <SelectItem key="very_poor" value="very_poor">Very Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leather Seats and SRS Activated - Side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Leather Seats</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={leatherSeats}
                onCheckedChange={onLeatherSeatsChange}
              />
              <span>{leatherSeats ? "Yes" : "No"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>SRS Activated</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={srsActivated}
                onCheckedChange={onSrsActivatedChange}
              />
              <span>{srsActivated ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>

        {/* SRS Damage Photos - Conditional */}
        {srsActivated && (
          <div className="space-y-2">
            <Label>SRS Damage Photos (up to 4)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="h-32 text-center">
                <PhotoUploadCard
                  title="SRS Damage 1"
                  description="Photo of SRS damage"
                  imagePath={srsDamagePhotoPath1}
                  onImagePathChange={onSrsDamagePhotoPath1Change}
                  uploadPath={`claims/${claimId}/inspections/${inspectionId}/interior/srs-damage-1`}
                  size="small"
                />
              </div>
              <div className="h-32 text-center">
                <PhotoUploadCard
                  title="SRS Damage 2"
                  description="Photo of SRS damage"
                  imagePath={srsDamagePhotoPath2}
                  onImagePathChange={onSrsDamagePhotoPath2Change}
                  uploadPath={`claims/${claimId}/inspections/${inspectionId}/interior/srs-damage-2`}
                  size="small"
                />
              </div>
              <div className="h-32 text-center">
                <PhotoUploadCard
                  title="SRS Damage 3"
                  description="Photo of SRS damage"
                  imagePath={srsDamagePhotoPath3}
                  onImagePathChange={onSrsDamagePhotoPath3Change}
                  uploadPath={`claims/${claimId}/inspections/${inspectionId}/interior/srs-damage-3`}
                  size="small"
                />
              </div>
              <div className="h-32 text-center">
                <PhotoUploadCard
                  title="SRS Damage 4"
                  description="Photo of SRS damage"
                  imagePath={srsDamagePhotoPath4}
                  onImagePathChange={onSrsDamagePhotoPath4Change}
                  uploadPath={`claims/${claimId}/inspections/${inspectionId}/interior/srs-damage-4`}
                  size="small"
                />
              </div>
            </div>
          </div>
        )}

        {/* Jack and Tools */}
        <div className="space-y-2">
          <Label>Jack and Tools Present</Label>
          <div className="flex items-center space-x-2">
            <Switch
              checked={jackToolsPresent}
              onCheckedChange={onJackToolsPresentChange}
            />
            <span>{jackToolsPresent ? "Yes" : "No"}</span>
          </div>
        </div>

        {/* Jack and Tools Photo - Conditional */}
        {jackToolsPresent && (
          <div className="space-y-2 text-center">
            <Label className="text-center">Jack and Tools Photo</Label>
            <div className="max-w-[200px] mx-auto">
              <PhotoUploadCard
                title="Jack and Tools"
                description="Photo of jack and tools"
                imagePath={jackToolsPhotoPath}
                onImagePathChange={onJackToolsPhotoPathChange}
                uploadPath={`claims/${claimId}/inspections/${inspectionId}/interior/jack-tools`}
                size="small"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
