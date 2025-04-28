import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";

export default function ThreeSixtyTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">360° View</h2>
      <Card>
        <CardHeader>
          <CardTitle>Vehicle 360° Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No 360° images available</h3>
            <p className="text-muted-foreground mt-2">
              360° image viewer will be implemented in a future update.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
