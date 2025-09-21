import { NextRequest, NextResponse } from "next/server";
import {
  authorizeProjectDeletion,
  AuthorizationError,
} from "@/services/project-service/authorize-project-deletion.service";
import { deleteProjectFromDb } from "@/services/project-service/delete-project.service";
import { authOptions } from "@/lib/auth"; // Assumed path
import { db } from "@/lib/db"; // Assumed path
import { logActivity } from "@/services/activity-user/activity-user.service"; // Assumed path
import { ACTIVITY_ACTIONS } from "@/services/activity-user/helper"; // Assumed path
import { getServerSession } from "next-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; projectId: string }> }
) {
  try {


     const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { userId, projectId } = await params;

    // --- Orchestration Starts ---

    // 1. Authorize: Call the dedicated authorization service first.
    // If this fails, it will throw an error and the process stops here.
    await authorizeProjectDeletion({ userId });

    // 2. Delete: If authorization succeeds, call the dedicated deletion service.
    const deletedProject = await deleteProjectFromDb(projectId);

    // 3. Log Activity: If deletion succeeds, call the logging service.
    await logActivity(db, {
      userId: session.user.id,
      projectId: deletedProject.id,
      action: ACTIVITY_ACTIONS.DELETE_PROJECT, // Assumed action type
      description: `${session.user.name || "A user"} deleted the project "${
        deletedProject.name
      }".`,
    });

    // You could add more services here, like sending emails or notifications.
    // await sendDeletionNotification(deletedProject);

    // --- Orchestration Ends ---

    return NextResponse.json(
      {
        message: "Project deleted successfully",
        data: deletedProject,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.log("API Error:", error);

    // The catch block now handles errors from any of the orchestrated services.
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ message: error.message }, { status: 403 }); // Forbidden
    }

    // Handle database or other generic errors
    return NextResponse.json(
      { message: "An internal error occurred." },
      {
        status: 500,
      }
    );
  }
}
