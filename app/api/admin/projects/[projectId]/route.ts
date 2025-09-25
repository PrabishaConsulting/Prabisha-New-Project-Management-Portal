import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ❗ Placeholder for your actual authentication logic
async function checkAdminAuth() {
  // TO_DO: Replace with your session validation
  console.log("Auth check passed (placeholder)");
}

// PATCH a project's details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await checkAdminAuth();
    const { projectId } = await params;
    const body = await request.json();
    const { name, description, status, priority, projectType, dueDate } = body;

    const updatedProject = await db.project.update({
      where: { id: projectId },
      data: {
        name,
        description,
        status,
        priority,
        projectType,
        // Prisma expects a Date object or null for DateTime fields
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("PATCH Project Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}