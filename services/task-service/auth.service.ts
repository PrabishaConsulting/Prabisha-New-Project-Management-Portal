import { db } from '@/lib/db';
import { ProjectRole } from '@/app/generated/client';

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Checks if a user is a member of a project. Throws an error if not.
 * @returns The user's role ('LEAD' or 'MEMBER').
 */
export async function authorizeProjectMember(
  userId: string,
  projectId: string
): Promise<ProjectRole> {
  const membership = await db.projectMember.findUnique({
    // ✨ FIX: Use the special 'userId_projectId' object for compound unique keys.
    where: {
      projectId_userId: {
        projectId: projectId,
        userId: userId,
      },
    },
  });

  if (!membership) {
    throw new AuthorizationError('You are not a member of this project.');
  }

  return membership.role;
}