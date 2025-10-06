import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Download, File, FileText, Image, Video, Music, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Define a clear type for the page's props.
type ProjectPageProps = {
  params: Promise<{ projectId: string }>; // The promise will be resolved by Next.js
};

// Helper function to get appropriate icon based on file type
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return <Image className="h-5 w-5" />;
  }
  if (['mp4', 'avi', 'mov', 'webm'].includes(ext || '')) {
    return <Video className="h-5 w-5" />;
  }
  if (['mp3', 'wav', 'ogg'].includes(ext || '')) {
    return <Music className="h-5 w-5" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
    return <Archive className="h-5 w-5" />;
  }
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
    return <FileText className="h-5 w-5" />;
  }
  return <File className="h-5 w-5" />;
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await getServerSession(authOptions);
  const { projectId } = await params;

  // 1. Check for a valid session and user ID
  if (!session?.user?.id) {
    redirect("/(auth)/sign-in");
  }

  // 2. Fetch the project and include its tasks and their attachments
  const projectWithAttachments = await db.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      name: true,
      tasks: {
        where: {
          attachments: {
            some: {},
          },
        },
        select: {
          title: true,
          attachments: true,
        },
      },
    },
  });

  // 3. Handle the case where the project is not found
  if (!projectWithAttachments) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Project not found or it has no tasks with attachments.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. Process the data into a simpler, flattened list
  const allAttachmentsList = projectWithAttachments.tasks.flatMap((task) =>
    task.attachments.map((attachment) => ({
      taskTitle: task.title,
      attachmentDetails: {
        id: attachment.id,
        filename: attachment.filename,
        url: attachment.url,
        size: formatFileSize(attachment.fileSize || 0),
        fileSize: attachment.fileSize || 0,
      },
    }))
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Project Attachments</h1>
        <p className="text-muted-foreground">{projectWithAttachments.name}</p>
        <Badge variant="secondary" className="mt-2">
          {allAttachmentsList.length} {allAttachmentsList.length === 1 ? 'file' : 'files'}
        </Badge>
      </div>

      {allAttachmentsList.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allAttachmentsList.map((item, index) => (
            <Card key={index} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.taskTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-secondary/50 text-secondary-foreground">
                    {getFileIcon(item.attachmentDetails.filename)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={item.attachmentDetails.filename}>
                      {item.attachmentDetails.filename}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.attachmentDetails.size}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <a 
                      href={item.attachmentDetails.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <a
                      href={item.attachmentDetails.url}
                      download={item.attachmentDetails.filename}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No attachments found for any tasks in this project.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}