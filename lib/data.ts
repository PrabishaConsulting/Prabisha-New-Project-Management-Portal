// lib/data.ts
import { notFound } from "next/navigation";
import { db } from "./db";
export async function getProjectForEdit(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      department: true,
      internalProduct: true,
      members: {
        include: { user: true },
      },
    },
  });

  if (!project) {
    notFound(); // Triggers the 404 page if project doesn't exist
  }
  return project;
}

export async function getInternalUsers() {
  return await db.user.findMany({
    where: {
      userType: "INTERNAL",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

export async function getAllDepartments() {
  return await db.department.findMany({
    select: {
      id: true,
      name: true,
    },
  });
}

export async function getAllInternalClient() {
  return await db.internalProduct.findMany({
    select: {
      id: true,
      name: true,
    },
  });
}

export async function getAllExternalClient() {
  return await db.user.findMany({
    where: {
      userType: "CLIENT",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}
