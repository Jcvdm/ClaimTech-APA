import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AttachmentList } from "@/lib/api/domains/attachments/types";
import { formatDate, formatFileSize } from "@/lib/utils";
import { FileIcon, DownloadIcon, FileTextIcon, ImageIcon, FileArchiveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentsTabProps {
  attachmentsData?: AttachmentList | null;
}

export default function DocumentsTab({ attachmentsData }: DocumentsTabProps) {
  if (!attachmentsData || attachmentsData.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Documents</h2>
        <p className="text-muted-foreground">No documents available</p>
      </div>
    );
  }

  // Sort attachments by date (newest first)
  const sortedAttachments = [...attachmentsData].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Documents</h2>
      
      <div className="space-y-4">
        {sortedAttachments.map((attachment) => (
          <DocumentCard key={attachment.id} attachment={attachment} />
        ))}
      </div>
    </div>
  );
}

function DocumentCard({ attachment }: { attachment: AttachmentList[number] }) {
  // Function to get the appropriate icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8" />;
    } else if (mimeType.includes('pdf')) {
      return <FileTextIcon className="h-8 w-8" />;
    } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
      return <FileArchiveIcon className="h-8 w-8" />;
    } else {
      return <FileIcon className="h-8 w-8" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="text-muted-foreground">
            {getFileIcon(attachment.mime_type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{attachment.file_name}</h3>
            <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
              <span>{formatFileSize(attachment.file_size)}</span>
              <span>Uploaded {formatDate(new Date(attachment.created_at))}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <DownloadIcon className="h-4 w-4" />
            <span>Download</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
