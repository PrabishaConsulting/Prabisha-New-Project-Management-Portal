
import { db } from "@/lib/db";
// Assume 'db' is your initialized Prisma Client instance
/**
 * Gets a single active workspace ID for a user, prioritizing owned workspaces.
 * @param userEmail The email of the user.
 * @returns The workspace ID as a string, or null if none is found.
 */
export const getActiveWorkspaceId = async (userEmail: string): Promise<string | null> => {
  if (!userEmail) {
    return null;
  }

  // Query for both owned workspaces and memberships in a single call
  const user = await db.user.findUnique({
    where: {
      email: userEmail,
    },
    select: {
      // 1. Check for workspaces this user OWNS
      ownedWorkspaces: {
        select: {
          id: true, // The workspace ID
        },
        take: 1, // We only need one
      },
      // 2. Check for workspaces this user is a MEMBER of
      workspaceMemberships: {
        select: {
          workspaceId: true,
        },
        take: 1, // We only need one
      },
    },
  });

  console.log(user);

  if (!user) {
    return null; // User not found
  }

  // Prioritize the owned workspace ID
  if (user.ownedWorkspaces.length > 0) {
    return user.ownedWorkspaces[0].id;
  }

  // Fallback to the member workspace ID
  if (user.workspaceMemberships.length > 0) {
    return user.workspaceMemberships[0].workspaceId;
  }

  // If user has no associated workspace
  return null;
};