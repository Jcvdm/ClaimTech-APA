import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface AttachmentsTabProps {
  isSubmitting: boolean;
  claimCreationComplete: boolean;
  uploadedFiles: File[];
  uploadProgress: Record<string, number>;
  getRootProps: any;
  getInputProps: any;
  isDragActive: boolean;
  removeFile: (fileName: string) => void;
  uploadFiles: () => Promise<void>;
}

export function AttachmentsTab({
  isSubmitting,
  claimCreationComplete,
  uploadedFiles,
  uploadProgress,
  getRootProps,
  getInputProps,
  isDragActive,
  removeFile,
  uploadFiles
}: AttachmentsTabProps) {
  const router = useRouter();

  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-6 pb-2 border-b">Upload Attachments</h3>
        
        {!claimCreationComplete ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">
              Please complete the claim creation process before uploading attachments.
            </p>
          </div>
        ) : (
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>Drop the files here...</p>
              ) : (
                <div className="space-y-2">
                  <p>Drag and drop files here, or click to select files</p>
                  <p className="text-sm text-muted-foreground">
                    Supported file types: PDF, JPG, PNG, DOCX
                  </p>
                </div>
              )}
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-4 mt-6">
                <h4 className="font-medium">Files to upload ({uploadedFiles.length})</h4>
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex-1 mr-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <Progress value={uploadProgress[file.name] || 0} className="h-2" />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file.name)}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove file</span>
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between space-x-4 mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/claims")}
                    disabled={isSubmitting}
                  >
                    Skip Uploads
                  </Button>
                  <Button
                    type="button"
                    onClick={uploadFiles}
                    disabled={isSubmitting || uploadedFiles.length === 0}
                  >
                    {isSubmitting ? "Uploading..." : "Upload Files"}
                  </Button>
                </div>
              </div>
            )}

            {uploadedFiles.length === 0 && (
              <div className="flex justify-between space-x-4 mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/claims")}
                  disabled={isSubmitting}
                >
                  Skip Uploads
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push("/claims")}
                  disabled={isSubmitting}
                >
                  Finish
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
