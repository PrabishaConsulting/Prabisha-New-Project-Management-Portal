import { db } from "@/lib/db";
import { ProjectCreationError } from "@/utils/errors";
import { logActivity } from "../activity-user/activity-user.service";
import { ACTIVITY_ACTIONS } from "../activity-user/helper";
import { getCurrentUser } from "@/utils/getcurrentUser";

export interface ProjectCreationData {
  name: string;
  workspaceId: string;
  userId: string;
  dueDate: Date;
  departmentId: string;
  isClientProject: boolean;
  clientId?: string;
  internalProductId?: string;
}

export const createProjectInDb = async (projectData: ProjectCreationData) => {
  // --- VALIDATION ---
  if (projectData.isClientProject && !projectData.clientId) {
    throw new ProjectCreationError(
      "A Client ID is required when creating a project for an external client.",
      "VALIDATION_ERROR"
    );
  }
  if (!projectData.isClientProject && !projectData.internalProductId) {
    throw new ProjectCreationError(
      "An Internal Product ID is required when creating an internal project.",
      "VALIDATION_ERROR"
    );
  }

  const existingProject = await checkProjectNameExists({
    name: projectData.name,
    workspaceId: projectData.workspaceId,
  });

  if (existingProject) {
    throw new ProjectCreationError(
      "Project already exists. Please search and add tasks to it.",
      "DUPLICATE_ERROR"
    );
  }

  // --- DB TRANSACTION ---
  try {
    const result = await db.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: projectData.name,
          workspaceId: projectData.workspaceId,
          createdBy: projectData.userId,
          dueDate: projectData.dueDate,
          departmentId: projectData.departmentId,
          isClientProject: projectData.isClientProject,
          clientId: projectData.isClientProject ? projectData.clientId : null,
          internalProductId: !projectData.isClientProject
            ? projectData.internalProductId
            : null,
        },
      });

      await tx.projectMember.create({
        data: {
          projectId: newProject.id,
          userId: projectData.userId,
          role: "LEAD",
        },
      });

      // NOTE: `getCurrentUser` needs to be mocked in tests for this to pass.
      const currentUser = await getCurrentUser();
      if (currentUser) {
        await logActivity(db, { // Pass the transactional client `tx` to the logger
          userId: projectData.userId,
          projectId: newProject.id,
          action: ACTIVITY_ACTIONS.CREATE_PROJECT,
          description: `${currentUser.name} created the project "${newProject.name}".`,
        });
      }

      return { project: newProject, creatorId: projectData.userId };
    });

    return result;
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new ProjectCreationError(
        "Project name already exists in this workspace.",
        "DB_CONSTRAINT_ERROR",
        error
      );
    }
    console.error("[PROJECT_CREATION] Unexpected DB error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      meta: error.meta,
    });

    throw new ProjectCreationError(
      "Could not save the project due to an unexpected error.",
      "UNEXPECTED_ERROR"
    );
  }
};

export const checkProjectNameExists = async ({
  name,
  workspaceId,
}: {
  name: string;
  workspaceId: string;
}) => {
  const existingProject = await db.project.findFirst({
    where: {
      name: name,
      workspaceId: workspaceId,
    },
  });

  return existingProject;
};