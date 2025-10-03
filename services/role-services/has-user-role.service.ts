import { db } from '@/lib/db';


/**
 * Checks if a user has a specific global role.
 * @param userId The ID of the user to check.
 * @param expectedRole The `UserRole` to check for (e.g., UserRole.ADMIN).
 * @returns A boolean: `true` if the user has the exact role, otherwise `false`.
 */
export async function hasUserRole(
userId: string,  expectedRole: any): Promise<boolean> {
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      role: true, // Only fetch the role for efficiency
    },
  });

  if (!user) {
    // User not found, so they can't have the role.
    return false;
  }

  // Return true only if the user's role matches the one we're looking for.
  return user.role === expectedRole;
}