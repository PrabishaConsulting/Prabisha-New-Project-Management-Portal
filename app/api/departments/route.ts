import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@/app/generated/client';
import { z } from 'zod';

const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required.'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication & Authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For this example, we assume the user role is stored on the session user object
    // Or you would fetch the user from the DB to check their role

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
      }
    })

    if(!user){
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Forbidden: You do not have permission to create a department.' }, { status: 403 });
    }

    // 2. Validation
    const body = await request.json();
    const validation = createDepartmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }
    const { name } = validation.data;

    // 3. Database Creation & Error Handling
    const existingDepartment = await db.department.findUnique({ where: { name } });
    if (existingDepartment) {
      return NextResponse.json({ error: 'A department with this name already exists.' }, { status: 409 }); // 409 Conflict
    }

    const newDepartment = await db.department.create({
      data: { name },
    });

    // 4. Success Response
    return NextResponse.json(newDepartment, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('[DEPARTMENTS_POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}



// GET: To fetch all departments for the dropdown
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const departments = await db.department.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error('[DEPARTMENTS_GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: To update the user's own department
const updateDepartmentSchema = z.object({
  departmentId: z.string().cuid(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = session.user.id;

    const body = await request.json();
    const validation = updateDepartmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid department ID.' }, { status: 400 });
    }
    const { departmentId } = validation.data;

    // Update the currently logged-in user
    const updatedUser = await db.user.update({
      where: { id: currentUserId },
      data: { departmentId: departmentId },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[PROFILE_DEPARTMENT_PATCH]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}