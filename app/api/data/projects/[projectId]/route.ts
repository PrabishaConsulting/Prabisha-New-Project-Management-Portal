import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasUserRole } from "@/services/role-services/has-user-role.service";
import { logActivity } from '@/services/activity-user/activity-user.service'; // Adjust path if needed
import { ACTIVITY_ACTIONS } from '@/services/activity-user/helper'; // Adjust path if needed
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { projectMembership } from "@/services/role-services/has-user-project-role.service";
import { db } from "@/lib/db";
import { ProjectStatus , Priority, ProjectType ,  ProjectRole  , Prisma} from "@/app/generated/client";

/**
 * Zod schema for validating the incoming request body for PATCH requests.
 * This now matches the updated Prisma schema.
 */
const updateProjectSchema = z.object({
  // --- Scalar Fields ---
  name: z.string().min(3, "Name must be at least 3 characters").optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  projectType: z.nativeEnum(ProjectType).optional(), // New
  isClientProject: z.boolean().optional(), // New
  zohoFolderLink: z.url("Must URL").nullable().optional(), // New
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),

  // --- Relational ID Fields ---
  createdBy: z.string().cuid("Invalid creator ID").optional(),
  departmentId: z.string().cuid("Invalid department ID").nullable().optional(),
  clientId: z.string().cuid("Invalid client ID").nullable().optional(), // New
  internalProductId: z.string().cuid("Invalid product ID").nullable().optional(), // New

  // --- Many-to-Many Relation ---
  members: z.array(
    z.object({
      userId: z.string().cuid(),
      role: z.nativeEnum(ProjectRole),
    })
  ).optional(),
})
.refine(data => {
    // If isClientProject is explicitly being set to true, a clientId must also be provided.
    if (data.isClientProject === true && data.clientId === undefined) {
      // This validation only triggers if `isClientProject` is in the payload.
      // We need to ensure we don't block unsetting a client.
      return false;
    }
    return true;
}, {
    message: "A client must be selected when marking this as a client project.",
    path: ["clientId"],
});
/**
 * Handles GET requests to fetch a single project by its ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        // ✅ FIX: Removed 'image: true' because it doesn't exist on your User model
        creator: { select: { id: true, name: true } },
        members: {
          include: {
            // ✅ FIX: Removed 'image: true' here as well
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(project);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json(
      { message: "Error fetching project" },
      { status: 500 }
    );
  }
}

/**
 * Handles PATCH requests to update a project and its members.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const currentUserId = session.user.id;
  const { projectId } = await params;

  const canUpdate = await hasUserRole( currentUserId, 'ADMIN');
  const membership = await projectMembership(projectId , currentUserId)

  console.log(canUpdate , membership)

  if (!canUpdate || !membership) {
    return NextResponse.json({ message: 'Forbidden: You do not have permission to edit this project.' }, { status: 403 });
  }



  const body = await request.json();
  const validation = updateProjectSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Invalid input", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { members, createdBy, departmentId, clientId, internalProductId, ...scalarProjectData } = validation.data;

  try {
    const existingProject = await db.project.findUnique({
      where: { id: projectId },
      include: { members: { select: { userId: true, role: true } } },
    });

    if (!existingProject) {
      return NextResponse.json({ message: `Project with ID ${projectId} not found.` }, { status: 404 });
    }

    let hasChanges = false;
    const updatePayload: Prisma.ProjectUpdateInput = { ...scalarProjectData };

    // Handle relational fields separately using Prisma's 'connect' syntax
    if (createdBy && createdBy !== existingProject.createdBy) {
      updatePayload.creator = { connect: { id: createdBy } };
    }
    if (departmentId !== undefined && departmentId !== existingProject.departmentId) {
      updatePayload.department = departmentId ? { connect: { id: departmentId } } : { disconnect: true };
    }
    // if (clientId !== undefined && clientId !== existingProject.clientId) {
    //   updatePayload.client = clientId ? { connect: { id: clientId } } : { disconnect: true };
    // }
    if (internalProductId !== undefined && internalProductId !== existingProject.internalProductId) {
      updatePayload.internalProduct = internalProductId ? { connect: { id: internalProductId } } : { disconnect: true };
    }
    
    // Only update if the payload has keys (i.e., actual changes)
    if (Object.keys(updatePayload).length > 0) {
      await db.project.update({ where: { id: projectId }, data: updatePayload });
      hasChanges = true;
    }

    // Handle member changes
    if (members) {
      const currentMemberIds = new Set(existingProject.members.map(m => m.userId));
      const newMemberData = new Map(members.map(m => [m.userId, m.role]));
      
      const membersToDelete = [...currentMemberIds].filter(id => !newMemberData.has(id));
      if (membersToDelete.length > 0) {
        await db.projectMember.deleteMany({ where: { projectId, userId: { in: membersToDelete } } });
        hasChanges = true;
      }
      
      for (const [userId, role] of newMemberData.entries()) {
        const existingMember = existingProject.members.find(m => m.userId === userId);
        if (!existingMember || existingMember.role !== role) {
          await db.projectMember.upsert({
            where: { projectId_userId: { projectId, userId } },
            update: { role },
            create: { projectId, userId, role },
          });
          hasChanges = true;
        }
      }
    }

    // If any change occurred, create a single log entry
    if (hasChanges) {
      const currentUser = await db.user.findUnique({ where: { id: currentUserId }, select: { name: true } });
      const currentUserName = currentUser?.name || 'A user';
      await logActivity(db, {
        userId: currentUserId,
        projectId: projectId,
        action: ACTIVITY_ACTIONS.UPDATE_PROJECT_STATUS,
        description: `${currentUserName} updated details for the project "${existingProject.name}".`,
      });
    }
    
    const finalProject = await db.project.findUnique({
      where: { id: projectId },
      include: { members: true, department: true, internalProduct: true },
    });

    return NextResponse.json(finalProject, { status: 200 });
  } catch (error) {
    console.error("PATCH Failed:", error);
    return NextResponse.json({ message: "Failed to update project" }, { status: 500 });
  }
}