"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { TyreSingle } from "./TyreSingle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";

// Define the type for an additional tyre
export interface AdditionalTyre {
  id: string;
  label: string;
  facePhotoPath: string | null;
  measurementPhotoPath: string | null;
  treadPhotoPath: string | null;
  make: string;
  size: string;
  loadSpeed: string;
}

interface TyresSectionProps {
  claimId: string;
  inspectionId: string;
  tyreData: {
    // RF Tyre
    tyreRfFacePhotoPath: string | null;
    tyreRfMeasurementPhotoPath: string | null;
    tyreRfTreadPhotoPath: string | null;
    tyreRfMake: string;
    tyreRfSize: string;
    tyreRfLoadSpeed: string;
    
    // RR Tyre
    tyreRrFacePhotoPath: string | null;
    tyreRrMeasurementPhotoPath: string | null;
    tyreRrTreadPhotoPath: string | null;
    tyreRrMake: string;
    tyreRrSize: string;
    tyreRrLoadSpeed: string;
    
    // LR Tyre
    tyreLrFacePhotoPath: string | null;
    tyreLrMeasurementPhotoPath: string | null;
    tyreLrTreadPhotoPath: string | null;
    tyreLrMake: string;
    tyreLrSize: string;
    tyreLrLoadSpeed: string;
    
    // LF Tyre
    tyreLfFacePhotoPath: string | null;
    tyreLfMeasurementPhotoPath: string | null;
    tyreLfTreadPhotoPath: string | null;
    tyreLfMake: string;
    tyreLfSize: string;
    tyreLfLoadSpeed: string;
    
    // Spare Tyre
    tyreSpareFacePhotoPath: string | null;
    tyreSpareMeasurementPhotoPath: string | null;
    tyreSpareTreadPhotoPath: string | null;
    tyreSpareMake: string;
    tyreSparSize: string;
    tyreSparLoadSpeed: string;
  };
  onTyreDataChange: (updates: Partial<TyresSectionProps["tyreData"]>) => void;
  additionalTyres: AdditionalTyre[];
  onAdditionalTyresChange: (tyres: AdditionalTyre[]) => void;
}

export function TyresSection({
  claimId,
  inspectionId,
  tyreData,
  onTyreDataChange,
  additionalTyres,
  onAdditionalTyresChange
}: TyresSectionProps) {
  const [newTyreLabel, setNewTyreLabel] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Calculate completion status
  const standardTyrePositions = ["rf", "rr", "lr", "lf", "spare"];
  const totalStandardTyres = standardTyrePositions.length;
  let completedStandardTyres = 0;
  
  // Check each standard tyre for completion
  standardTyrePositions.forEach(pos => {
    const posUpper = pos.toUpperCase();
    const facePhoto = tyreData[`tyre${posUpper}FacePhotoPath` as keyof typeof tyreData];
    const measurementPhoto = tyreData[`tyre${posUpper}MeasurementPhotoPath` as keyof typeof tyreData];
    const treadPhoto = tyreData[`tyre${posUpper}TreadPhotoPath` as keyof typeof tyreData];
    const make = tyreData[`tyre${posUpper}Make` as keyof typeof tyreData];
    const size = tyreData[`tyre${posUpper}Size` as keyof typeof tyreData] || tyreData[`tyre${posUpper}size` as keyof typeof tyreData];
    const loadSpeed = tyreData[`tyre${posUpper}LoadSpeed` as keyof typeof tyreData];
    
    // Consider a tyre complete if it has at least one photo and all text fields
    if ((facePhoto || measurementPhoto || treadPhoto) && make && size && loadSpeed) {
      completedStandardTyres++;
    }
  });
  
  // Handle adding a new tyre
  const handleAddTyre = () => {
    if (!newTyreLabel.trim()) return;
    
    const newTyre: AdditionalTyre = {
      id: `tyre-${Date.now()}`,
      label: newTyreLabel.trim(),
      facePhotoPath: null,
      measurementPhotoPath: null,
      treadPhotoPath: null,
      make: "",
      size: "",
      loadSpeed: ""
    };
    
    onAdditionalTyresChange([...additionalTyres, newTyre]);
    setNewTyreLabel("");
    setIsDialogOpen(false);
  };
  
  // Handle removing an additional tyre
  const handleRemoveTyre = (id: string) => {
    onAdditionalTyresChange(additionalTyres.filter(tyre => tyre.id !== id));
  };
  
  // Handle updating an additional tyre
  const handleUpdateAdditionalTyre = (id: string, updates: Partial<AdditionalTyre>) => {
    onAdditionalTyresChange(
      additionalTyres.map(tyre => 
        tyre.id === id ? { ...tyre, ...updates } : tyre
      )
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Tyres</CardTitle>
          <Badge variant={completedStandardTyres === totalStandardTyres ? "success" : "outline"}>
            {completedStandardTyres} of {totalStandardTyres} standard tyres complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Standard Tyres */}
        <div className="space-y-8">
          {/* RF Tyre */}
          <TyreSingle
            title="Right Front (RF)"
            claimId={claimId}
            inspectionId={inspectionId}
            position="rf"
            facePhotoPath={tyreData.tyreRfFacePhotoPath}
            measurementPhotoPath={tyreData.tyreRfMeasurementPhotoPath}
            treadPhotoPath={tyreData.tyreRfTreadPhotoPath}
            make={tyreData.tyreRfMake}
            size={tyreData.tyreRfSize}
            loadSpeed={tyreData.tyreRfLoadSpeed}
            onFacePhotoPathChange={(path) => onTyreDataChange({ tyreRfFacePhotoPath: path })}
            onMeasurementPhotoPathChange={(path) => onTyreDataChange({ tyreRfMeasurementPhotoPath: path })}
            onTreadPhotoPathChange={(path) => onTyreDataChange({ tyreRfTreadPhotoPath: path })}
            onMakeChange={(value) => onTyreDataChange({ tyreRfMake: value })}
            onSizeChange={(value) => onTyreDataChange({ tyreRfSize: value })}
            onLoadSpeedChange={(value) => onTyreDataChange({ tyreRfLoadSpeed: value })}
          />
          
          {/* RR Tyre */}
          <TyreSingle
            title="Right Rear (RR)"
            claimId={claimId}
            inspectionId={inspectionId}
            position="rr"
            facePhotoPath={tyreData.tyreRrFacePhotoPath}
            measurementPhotoPath={tyreData.tyreRrMeasurementPhotoPath}
            treadPhotoPath={tyreData.tyreRrTreadPhotoPath}
            make={tyreData.tyreRrMake}
            size={tyreData.tyreRrSize}
            loadSpeed={tyreData.tyreRrLoadSpeed}
            onFacePhotoPathChange={(path) => onTyreDataChange({ tyreRrFacePhotoPath: path })}
            onMeasurementPhotoPathChange={(path) => onTyreDataChange({ tyreRrMeasurementPhotoPath: path })}
            onTreadPhotoPathChange={(path) => onTyreDataChange({ tyreRrTreadPhotoPath: path })}
            onMakeChange={(value) => onTyreDataChange({ tyreRrMake: value })}
            onSizeChange={(value) => onTyreDataChange({ tyreRrSize: value })}
            onLoadSpeedChange={(value) => onTyreDataChange({ tyreRrLoadSpeed: value })}
          />
          
          {/* LR Tyre */}
          <TyreSingle
            title="Left Rear (LR)"
            claimId={claimId}
            inspectionId={inspectionId}
            position="lr"
            facePhotoPath={tyreData.tyreLrFacePhotoPath}
            measurementPhotoPath={tyreData.tyreLrMeasurementPhotoPath}
            treadPhotoPath={tyreData.tyreLrTreadPhotoPath}
            make={tyreData.tyreLrMake}
            size={tyreData.tyreLrSize}
            loadSpeed={tyreData.tyreLrLoadSpeed}
            onFacePhotoPathChange={(path) => onTyreDataChange({ tyreLrFacePhotoPath: path })}
            onMeasurementPhotoPathChange={(path) => onTyreDataChange({ tyreLrMeasurementPhotoPath: path })}
            onTreadPhotoPathChange={(path) => onTyreDataChange({ tyreLrTreadPhotoPath: path })}
            onMakeChange={(value) => onTyreDataChange({ tyreLrMake: value })}
            onSizeChange={(value) => onTyreDataChange({ tyreLrSize: value })}
            onLoadSpeedChange={(value) => onTyreDataChange({ tyreLrLoadSpeed: value })}
          />
          
          {/* LF Tyre */}
          <TyreSingle
            title="Left Front (LF)"
            claimId={claimId}
            inspectionId={inspectionId}
            position="lf"
            facePhotoPath={tyreData.tyreLfFacePhotoPath}
            measurementPhotoPath={tyreData.tyreLfMeasurementPhotoPath}
            treadPhotoPath={tyreData.tyreLfTreadPhotoPath}
            make={tyreData.tyreLfMake}
            size={tyreData.tyreLfSize}
            loadSpeed={tyreData.tyreLfLoadSpeed}
            onFacePhotoPathChange={(path) => onTyreDataChange({ tyreLfFacePhotoPath: path })}
            onMeasurementPhotoPathChange={(path) => onTyreDataChange({ tyreLfMeasurementPhotoPath: path })}
            onTreadPhotoPathChange={(path) => onTyreDataChange({ tyreLfTreadPhotoPath: path })}
            onMakeChange={(value) => onTyreDataChange({ tyreLfMake: value })}
            onSizeChange={(value) => onTyreDataChange({ tyreLfSize: value })}
            onLoadSpeedChange={(value) => onTyreDataChange({ tyreLfLoadSpeed: value })}
          />
          
          {/* Spare Tyre */}
          <TyreSingle
            title="Spare"
            claimId={claimId}
            inspectionId={inspectionId}
            position="spare"
            facePhotoPath={tyreData.tyreSpareFacePhotoPath}
            measurementPhotoPath={tyreData.tyreSpareMeasurementPhotoPath}
            treadPhotoPath={tyreData.tyreSpareTreadPhotoPath}
            make={tyreData.tyreSpareMake}
            size={tyreData.tyreSparSize}
            loadSpeed={tyreData.tyreSparLoadSpeed}
            onFacePhotoPathChange={(path) => onTyreDataChange({ tyreSpareFacePhotoPath: path })}
            onMeasurementPhotoPathChange={(path) => onTyreDataChange({ tyreSpareMeasurementPhotoPath: path })}
            onTreadPhotoPathChange={(path) => onTyreDataChange({ tyreSpareTreadPhotoPath: path })}
            onMakeChange={(value) => onTyreDataChange({ tyreSpareMake: value })}
            onSizeChange={(value) => onTyreDataChange({ tyreSparSize: value })}
            onLoadSpeedChange={(value) => onTyreDataChange({ tyreSparLoadSpeed: value })}
          />
        </div>
        
        {/* Additional Tyres */}
        {additionalTyres.length > 0 && (
          <div className="space-y-8">
            <h3 className="text-lg font-semibold">Additional Tyres</h3>
            
            {additionalTyres.map(tyre => (
              <div key={tyre.id} className="relative border border-border rounded-md p-4">
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => handleRemoveTyre(tyre.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <TyreSingle
                  title={tyre.label}
                  claimId={claimId}
                  inspectionId={inspectionId}
                  position={`additional-${tyre.id}`}
                  facePhotoPath={tyre.facePhotoPath}
                  measurementPhotoPath={tyre.measurementPhotoPath}
                  treadPhotoPath={tyre.treadPhotoPath}
                  make={tyre.make}
                  size={tyre.size}
                  loadSpeed={tyre.loadSpeed}
                  onFacePhotoPathChange={(path) => handleUpdateAdditionalTyre(tyre.id, { facePhotoPath: path })}
                  onMeasurementPhotoPathChange={(path) => handleUpdateAdditionalTyre(tyre.id, { measurementPhotoPath: path })}
                  onTreadPhotoPathChange={(path) => handleUpdateAdditionalTyre(tyre.id, { treadPhotoPath: path })}
                  onMakeChange={(value) => handleUpdateAdditionalTyre(tyre.id, { make: value })}
                  onSizeChange={(value) => handleUpdateAdditionalTyre(tyre.id, { size: value })}
                  onLoadSpeedChange={(value) => handleUpdateAdditionalTyre(tyre.id, { loadSpeed: value })}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Add Tyre Button */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Add Tyre for Larger Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Additional Tyre</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tyre-label">Tyre Position/Label</Label>
                <Input
                  id="tyre-label"
                  placeholder="e.g., Rear Left Inner, Trailer Front Right, etc."
                  value={newTyreLabel}
                  onChange={(e) => setNewTyreLabel(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddTyre} disabled={!newTyreLabel.trim()}>Add Tyre</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
