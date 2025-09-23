import ProjectBoard from "@/components/kanban/project-board";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllDepartment } from "@/actions/department-action";

// Define a clear type for the page's props.
// This is the standard pattern that satisfies Next.js's internal type checks.
type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await getServerSession(authOptions);
  const { projectId } = await params;
  const department = await getAllDepartment()

  if(!department) return 
  // 1. Check for a valid session and user ID
  if (!session?.user?.id) {
    redirect("/(auth)/sign-in"); // Redirect to your sign-in page
  }

  const currentUserId = session.user.id;

  // 2. Check if the project exists using the correct database client ('db')
  const projectExists = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!projectExists) {
    // A better user experience would be to redirect to a 404 page
    // For now, this message works.
    return (
      <div className="text-center p-10 text-white">Project not found.</div>
    );
  }

  return (
    <div className="flex-1 min-h-0">
      <div className="flex-1 min-h-0">
        <ProjectBoard projectId={projectId} currentUserId={currentUserId} departments={department} />
      </div>
    </div>
  );
}
