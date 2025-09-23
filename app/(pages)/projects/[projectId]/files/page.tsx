import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Define a clear type for the page's props.
type ProjectPageProps = {
  params: Promise<{ projectId: string }>; // The promise will be resolved by Next.js
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await getServerSession(authOptions);
  const { projectId } = await params;

  // 1. Check for a valid session and user ID
  if (!session?.user?.id) {
    redirect("/(auth)/sign-in");
  }

  // 2. Fetch the project and include its tasks and their attachments
  // This is a single, efficient query to get all the data you need.
  const projectWithAttachments = await db.project.findUnique({
    where: {
      id: projectId,
      // Optional: You might also want to check if the user is a member of the project
      // members: { some: { userId: session.user.id } }
    },
    select: {
      name: true, // Select the project name for context
      tasks: {
        // We only want tasks that actually HAVE attachments
        where: {
          attachments: {
            some: {}, // This ensures the task has at least one attachment
          },
        },
        select: {
          title: true, // Get the task title
          attachments: true, // Get all attachments for that task
        },
      },
    },
  });

  // 3. Handle the case where the project is not found
  if (!projectWithAttachments) {
    return (
      <div className="text-center p-10 text-destructive">
        Project not found or it has no tasks with attachments.
      </div>
    );
  }


  // 5. Process the data into a simpler, flattened list for easier use
  const allAttachmentsList = projectWithAttachments.tasks.flatMap((task) =>
    task.attachments.map((attachment) => ({
      taskTitle: task.title,
      attachmentDetails: {
        id: attachment.id,
        filename: attachment.filename,
        url: attachment.url,
        size: `${(attachment.fileSize ? attachment.fileSize : 0 / 1024).toFixed(1)} KB`,
      },
    }))
  );

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-4">
        Attachments for: {projectWithAttachments.name}
      </h1>
      {/* Example of how you could render this data */}
      <div className="space-y-4">
        {allAttachmentsList.length > 0 ? (
          allAttachmentsList.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg bg-card">
              <p className="font-semibold">
                From Task:{" "}
                <span className="font-normal text-muted-foreground">
                  {item.taskTitle}
                </span>
              </p>
              <a
                href={item.attachmentDetails.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                {item.attachmentDetails.filename}
              </a>
              <p className="text-sm text-muted-foreground">
                {item.attachmentDetails.size}
              </p>
            </div>
          ))
        ) : (
          <p>No attachments found for any tasks in this project.</p>
        )}
      </div>
    </div>
  );
}