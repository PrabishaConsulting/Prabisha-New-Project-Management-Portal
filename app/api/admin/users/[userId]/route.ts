import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

// ❗ Placeholder for your actual authentication/authorization logic
async function checkAdminAuth() {
  // TO_DO: Replace with your session validation logic (e.g., from next-auth)
  // Example:
  // const session = await getServerSession(authOptions);
  // if (!session?.user || session.user.role !== Role.ADMIN) {
  //   throw new Error('Not authorized');
  // }
  console.log('Auth check passed (placeholder)');
}

// PATCH: Update a user's global role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await checkAdminAuth();
    const { userId } = await params;
    const body = await request.json();
    const { role } = body as { role?: Role };

    if (!role || !Object.values(Role).includes(role)) {
      return new NextResponse('Invalid role', { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/admin/users/[userId] error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}