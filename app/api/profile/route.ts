import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth"; // Your NextAuth config
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userProfile = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        departmentId: true, // Make sure to select the departmentId
      },
    });

    if (!userProfile) {
      return new NextResponse("User not found", { status: 404 });
    }

    return NextResponse.json(userProfile);

  } catch (error) {
    console.error("[PROFILE_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// app/api/profile/route.ts

import { z } from 'zod';

// Request body validation schema
const updateDepartmentSchema = z.object({
  departmentId: z.string().cuid(),
});

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateDepartmentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const { departmentId } = validationResult.data;

    // Verify department exists
    const departmentExists = await db.department.findUnique({
      where: { id: departmentId },
      select: { id: true }
    });

    if (!departmentExists) {
      return NextResponse.json(
        { error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    // Update user's department
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { departmentId },
      select: { 
        id: true,
        departmentId: true,
        department: { select: { name: true } }
      }
    });

    return NextResponse.json({
      message: 'Department updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Department update error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}