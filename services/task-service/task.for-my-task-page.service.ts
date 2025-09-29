// lib/services/task.service.ts

import { db } from '@/lib/db';

/**
 * Fetches all necessary data for the task creation form context.
 * This includes projects the user is a member of, departments, and user details.
 * @param userId - The ID of the currently authenticated user.
 */
export async function getTaskFormContextData(userId: string): Promise<{
  projects: any;
  currentUser: any;
  departments: any[];
  userDepartment: any; // Add user department to response
}> {
  // Fetch user projects with department information
  const userProjects = await db.project.findMany({
    where: {
      members: {
        some: {
          userId: userId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      members: {
        select: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  // Fetch all departments
  const departments = await db.department.findMany({
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
    },
  });

  // Fetch current user with department
  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      departmentId: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    projects: userProjects,
    currentUser,
    departments,
    userDepartment: currentUser?.department || null, // Include user's department
  };
}