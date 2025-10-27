import { Role } from '@/app/generated/client';
import { hasUserRole } from '@/services/role-services/has-user-role.service';

// A custom error for clear, specific error handling in the API route
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

interface AuthorizeParams {
  userId: string;
  // projectId could be used here for more complex, project-specific checks
}

/**
 * Checks if a user is authorized to delete a project.
 * Throws an AuthorizationError if the check fails.
 * @returns {Promise<void>} Resolves if authorized, otherwise rejects.
 */
export async function authorizeProjectDeletion({ userId }: AuthorizeParams): Promise<void> {
  // Check if the user has the global ADMIN role.
  // This is a safer default for a destructive action.
  const isAuthorized = await hasUserRole(userId, Role.ADMIN);

  if (!isAuthorized) {
    throw new AuthorizationError('You do not have the required permissions to delete this project.');
  }
}