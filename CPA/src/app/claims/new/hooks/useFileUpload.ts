import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

export function useFileUpload(
  newlyCreatedClaimId: string | null,
  isSubmitting: boolean,
  claimCreationComplete: boolean,
  setIsSubmitting: (value: boolean) => void
) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // File dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Add the new files to the uploadedFiles state
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);

    // Initialize progress for each file
    const newProgress: Record<string, number> = {};
    acceptedFiles.forEach(file => {
      newProgress[file.name] = 0;
    });
    setUploadProgress(prev => ({ ...prev, ...newProgress }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !claimCreationComplete || isSubmitting
  });

  // Handle file removal
  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(file => file.name !== fileName));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
  };

  // Handle file upload
  const uploadFiles = async () => {
    if (!newlyCreatedClaimId || uploadedFiles.length === 0) return;

    setIsSubmitting(true);

    // Simulate file upload for now
    // In a real implementation, you would use Supabase Storage
    for (const file of uploadedFiles) {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: progress
        }));

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
    setIsSubmitting(false);
  };

  return {
    uploadedFiles,
    uploadProgress,
    getRootProps,
    getInputProps,
    isDragActive,
    removeFile,
    uploadFiles
  };
}
