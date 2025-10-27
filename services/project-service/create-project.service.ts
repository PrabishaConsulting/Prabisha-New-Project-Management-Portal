// services/project-service/create-project.service.ts
import { db } from "@/lib/db";
import { ProjectCreationError } from "@/utils/errors";
import { ACTIVITY_ACTIONS } from "../activity-user/helper";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { generateNextProjectCode } from "@/utils/project-code";
import { ProjectRole } from "@/app/generated/client";


export interface ProjectCreationData {
  name: string;
  workspaceId: string;
  userId: string;
  departmentId: string;
  isClientProject: boolean;
  clientId?: string; 
  internalProductId?:string;
  memberIds: string[] ;
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

  // Get the current user *before* starting the transaction
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new ProjectCreationError(
      "User not found or not authenticated.",
      "AUTH_ERROR"
    );
  }

  // Generate project code outside transaction
  const projectCode = await generateNextProjectCode();
  
  // Calculate due date as one month from now
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + 1);

  try {
    // Use a transaction with increased timeout
    const result = await db.$transaction(async (tx) => {
      // Create the project
      const newProject = await tx.project.create({
        data: {
          name: projectData.name,
          workspaceId: projectData.workspaceId,
          createdBy: projectData.userId,
          dueDate,
          departmentId: projectData.departmentId,
          isClientProject: projectData.isClientProject,
          clientId: projectData.isClientProject ? projectData.clientId : null,
          projectCode,
          internalProductId: !projectData.isClientProject
            ? projectData.internalProductId
            : null,
        },
      });

      // Prepare project members data
      const projectMembersData = projectData.memberIds.map((memberId, index) => ({
        projectId: newProject.id,
        userId: memberId,
        role: index === 0 ? ProjectRole.LEAD : ProjectRole.MEMBER, // First member (creator) is LEAD
      }));

      // Create all project members in a single operation
      await tx.projectMember.createMany({
        data: projectMembersData,
      });

      return { project: newProject, creatorId: projectData.userId };
    }, {
      maxWait: 5000, // The maximum time to wait for a transaction to become available
      timeout: 15000, // The maximum time a transaction can run
    });

    // Log activity outside the transaction to avoid timeout issues
    try {
      await db.activityLog.create({
        data: {
          userId: projectData.userId,
          projectId: result.project.id,
          action: ACTIVITY_ACTIONS.CREATE_PROJECT,
          description: `${currentUser.name} created the project "${result.project.name}".`,
        },
      });
    } catch (logError) {
      console.error("Failed to log activity:", logError);
      // Don't throw here - the project was created successfully
    }

    return result;
  } catch (error: any) {
    if (error.code === "P2002") {
      // Check if it's a workspace+name constraint violation
      if (error.meta?.target?.includes("workspaceId") && error.meta?.target?.includes("name")) {
        throw new ProjectCreationError(
          "A project with this name already exists in this workspace. Please choose a different name.",
          "DUPLICATE_ERROR"
        );
      }
      throw new ProjectCreationError(
        "Database constraint violation.",
        "DB_CONSTRAINT_ERROR",
        error
      );
    }
    
    if (error.code === "P2028") {
      throw new ProjectCreationError(
        "Transaction timeout. Please try again with fewer members or contact support.",
        "TRANSACTION_TIMEOUT",
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