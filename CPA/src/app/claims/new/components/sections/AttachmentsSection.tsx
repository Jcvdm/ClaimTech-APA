'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, X, Upload, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface AttachmentsSectionProps {
  isSubmitting: boolean;
  claimCreationComplete: boolean;
  uploadedFiles: File[];
  uploadProgress: Record<string, number>;
  getRootProps: any;
  getInputProps: any;
  isDragActive: boolean;
  removeFile: (fileName: string) => void;
  uploadFiles: () => Promise<void>;
  claimId?: string;
}

export function AttachmentsSection({
  isSubmitting,
  claimCreationComplete,
  uploadedFiles,
  uploadProgress,
  getRootProps,
  getInputProps,
  isDragActive,
  removeFile,
  uploadFiles,
  claimId
}: AttachmentsSectionProps) {
  const router = useRouter();

  return (
    <Card className="mb-6" id="attachments-section">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Attachments</CardTitle>
          <Badge variant="outline">Optional</Badge>
        </div>
        <CardDescription>
          {claimCreationComplete
            ? "Your claim has been created successfully. You can now upload attachments."
            : "Please complete the claim information first before uploading attachments."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {claimCreationComplete ? (
          <>
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input {...getInputProps()} disabled={isSubmitting} />
              <div className="flex flex-col items-center justify-center space-y-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isDragActive
                    ? "Drop the files here..."
                    : "Drag and drop files here, or click to select files"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported file types: PDF, JPG, PNG, DOCX
                </p>
              </div>
            </div>

            {/* File List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Files to Upload</h3>
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {uploadProgress[file.name] > 0 && (
                          <div className="w-24">
                            <Progress
                              value={uploadProgress[file.name]}
                              className="h-2"
                            />
                          </div>
                        )}
                        {uploadProgress[file.name] === 100 ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeFile(file.name)}
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/claims")}
                disabled={isSubmitting}
              >
                Skip Uploads
              </Button>
              <Button
                onClick={uploadFiles}
                disabled={isSubmitting || uploadedFiles.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>Upload Files</>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-center">
              <p className="text-muted-foreground">
                Please complete and submit the claim information first.
              </p>
              <p className="text-muted-foreground mt-2">
                You'll be able to upload attachments after the claim is created.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
