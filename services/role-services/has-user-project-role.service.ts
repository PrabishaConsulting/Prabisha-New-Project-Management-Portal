import { db } from "@/lib/db";
import { ProjectRole } from "@/app/generated/client";

/**
 * Checks if a user has a specific role within a project.
 * @param userId The ID of the user to check.
 * @param projectId The ID of the project to check in.
 * @param expectedRole The `ProjectRole` to check for (e.g., ProjectRole.LEAD).
 * @returns A boolean: `true` if the user has the exact role in the project, otherwise `false`.
 */
export async function hasProjectRole(
  userId: string,
  projectId: string,
  expectedRole: ProjectRole
): Promise<boolean> {
  const projectMember = await db.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: projectId,
        userId: userId,
      },
    },
    select: {
      role: true, // Only fetch the role for efficiency
    },
  });

  if (!projectMember) {
    // User is not a member of this project
    return false;
  }

  // Return true only if the user's role matches the one we're looking for
  return projectMember.role === expectedRole;
}

/**
 * Checks if a user can edit a project (is a project lead).
 * @param userId The ID of the user to check.
 * @param projectId The ID of the project to check.
 * @returns A boolean: `true` if the user can edit the project, otherwise `false`.
 */
export async function canEditProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  return hasProjectRole(userId, projectId, ProjectRole.LEAD);
}

/**
 * Gets a user's role within a project.
 * @param userId The ID of the user.
 * @param projectId The ID of the project.
 * @returns The user's role in the project or null if they're not a member.
 */
export async function getProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  const projectMember = await db.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: projectId,
        userId: userId,
      },
    },
    select: {
      role: true,
    },
  });

  return projectMember?.role || null;
}

/**
 * Checks if a user is a member of a project (has any role).
 * @param userId The ID of the user to check.
 * @param projectId The ID of the project to check.
 * @returns A boolean: `true` if the user is a member of the project, otherwise `false`.
 */
export async function isProjectMember(
  userId: string,
  projectId: string
): Promise<boolean> {
  const projectMember = await db.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: projectId,
        userId: userId,
      },
    },
    select: {
      id: true, // Just need to check if the record exists
    },
  });

  return !!projectMember;
}

export const projectMembership = async (projectId : string , userId : string) => {
  const membership = await db.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: projectId, userId: userId },
    },
  });
  if (!membership) {
    return {
      error: "Forbidden: You are not a member of this project.",
      status: 403,
    };
  }
  return true
};
