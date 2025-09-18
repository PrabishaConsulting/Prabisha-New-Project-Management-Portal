import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma, ProjectRole } from "@prisma/client";
import { ProjectStatus, Priority, ProjectType } from '@prisma/client';
import { hasUserRole } from "@/services/role-services/has-user-role.service";
import { logActivity } from '@/services/activity-user/activity-user.service'; // Adjust path if needed
import { ACTIVITY_ACTIONS } from '@/services/activity-user/helper'; // Adjust path if needed
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
  { params }: { params: { projectId: string } }
) {
  // --- MODIFICATION START ---
  // 2. Authenticate and get the user making the changes
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const currentUserId = session.user.id;
  // --- MODIFICATION END ---

  const { projectId } = params;
  const body = await request.json();

  const validation = updateProjectSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        message: 'Invalid input',
        errors: validation.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { members, createdBy, departmentId, internalProductId, ...scalarProjectData } =
    validation.data;

  try {
    // --- MODIFICATION START ---
    // 3. Fetch the existing project with all relations needed for logging
    const existingProject = await db.project.findUnique({
      where: { id: projectId },
      include: {
        members: { select: { userId: true, role: true } },
        department: { select: { name: true } }, // Include department name
        creator: { select: { name: true } }, // Include creator name
      },
    });
    // --- MODIFICATION END ---

    if (!existingProject) {
      return NextResponse.json(
        { message: `Project with ID ${projectId} not found.` },
        { status: 404 }
      );
    }

    // --- MODIFICATION START ---
    // 4. Prepare a list to hold all change descriptions for logging
    const logDescriptions: string[] = [];
    // --- MODIFICATION END ---

    const updatePayload: Prisma.ProjectUpdateInput = {};

    // Compare and log scalar field changes
    if (scalarProjectData.name && scalarProjectData.name !== existingProject.name) {
      updatePayload.name = scalarProjectData.name;
      logDescriptions.push(`changed the project name to "${scalarProjectData.name}".`);
    }
    if (scalarProjectData.status && scalarProjectData.status !== existingProject.status) {
      updatePayload.status = scalarProjectData.status;
      logDescriptions.push(`updated the status to ${scalarProjectData.status}.`);
    }
    if (scalarProjectData.dueDate && scalarProjectData.dueDate !== existingProject.dueDate) {
      updatePayload.dueDate = scalarProjectData.dueDate;
      logDescriptions.push(`set the due date to ${new Date(scalarProjectData.dueDate).toLocaleDateString()}.`);
    }
    // ... (add similar checks for description, priority, startDate, etc.)

    // Compare and log relational changes
    if (createdBy && createdBy !== existingProject.createdBy) {
      updatePayload.creator = { connect: { id: createdBy } };
      const newCreator = await db.user.findUnique({ where: { id: createdBy }, select: { name: true } });
      logDescriptions.push(`changed the project lead from "${existingProject.creator?.name}" to "${newCreator?.name}".`);
    }

    if (departmentId !== undefined && departmentId !== existingProject.departmentId) {
        if (departmentId === null) {
          updatePayload.department = { disconnect: true };
          logDescriptions.push(`removed the project from the "${existingProject.department?.name}" department.`);
        } else {
          updatePayload.department = { connect: { id: departmentId } };
          const newDept = await db.department.findUnique({where: { id: departmentId }, select: { name: true } });
          logDescriptions.push(`assigned the project to the "${newDept?.name}" department.`);
        }
    }
    
    // Update the project's scalar and simple relation fields
    if (Object.keys(updatePayload).length > 0) {
        await db.project.update({
          where: { id: projectId },
          data: updatePayload,
        });
    }

    // Handle and log member changes
    if (members) {
      const currentMemberIds = new Set(existingProject.members.map((m) => m.userId));
      const newMemberData = new Map(members.map(m => [m.userId, m.role]));
      const allUserIds = new Set([...currentMemberIds, ...newMemberData.keys()]);
      
      const userNames = await db.user.findMany({
        where: { id: { in: [...allUserIds] } },
        select: { id: true, name: true },
      }).then(users => new Map(users.map(u => [u.id, u.name || 'Unknown User'])));
      
      // Members to delete
      const membersToDelete = [...currentMemberIds].filter(id => !newMemberData.has(id));
      if (membersToDelete.length > 0) {
        await db.projectMember.deleteMany({ where: { projectId, userId: { in: membersToDelete } } });
        membersToDelete.forEach(id => logDescriptions.push(`removed ${userNames.get(id)} from the project.`));
      }
      
      // Members to add or update
      for (const [userId, role] of newMemberData.entries()) {
          const existingMember = existingProject.members.find(m => m.userId === userId);
          if (!existingMember) {
              await db.projectMember.create({ data: { projectId, userId, role } });
              logDescriptions.push(`added ${userNames.get(userId)} to the project as a ${role}.`);
          } else if (existingMember.role !== role) {
              await db.projectMember.update({ where: { projectId_userId: { projectId, userId } }, data: { role } });
              logDescriptions.push(`changed ${userNames.get(userId)}'s role to ${role}.`);
          }
      }
    }

    // --- MODIFICATION START ---
    // 5. Batch-create all log entries if any changes were made
    if (logDescriptions.length > 0) {
      const currentUser = await db.user.findUnique({ where: { id: currentUserId }, select: { name: true } });
      const currentUserName = currentUser?.name || 'A user';
      
      const logPromises = logDescriptions.map(description =>
        logActivity(db, {
          userId: currentUserId,
          projectId: projectId,
          action: ACTIVITY_ACTIONS.UPDATE_PROJECT_STATUS,
          description: `${currentUserName} ${description}`,
        })
      );
      await Promise.all(logPromises);
    }
    // --- MODIFICATION END ---
    
    // Fetch the final state of the project to return
    const finalProject = await db.project.findUnique({
        where: { id: projectId },
        include: { members: true, department: true } // Include relations in the response
    });

    return NextResponse.json(finalProject, { status: 200 });

  } catch (error) {
    console.error("Project PATCH Failed:", error);
    return NextResponse.json(
      { message: 'Failed to update project due to an internal error.' },
      { status: 500 }
    );
  }
}

