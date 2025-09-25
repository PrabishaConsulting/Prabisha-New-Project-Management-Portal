import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ❗ Placeholder for your actual authentication logic
async function checkAdminAuth() {
  // TO_DO: Replace this with your session validation logic (e.g., from next-auth)
  // Example: const session = await getServerSession(authOptions);
  // if (!session?.user || session.user.role !== Role.ADMIN) {
  //   throw new Error("Not authorized");
  // }
  console.log("Auth check passed (placeholder)");
}

// GET all users
export async function GET(request: NextRequest) {
  try {
    await checkAdminAuth();
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET Users Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// POST a new user and add to workspace
export async function POST(request: NextRequest) {
  try {
    await checkAdminAuth();
    const body = await request.json();
    const { email, name, password, role, workspaceId } = body;

    if (!email || !name || !password || !role || !workspaceId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return new NextResponse("User with this email already exists", { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Use a transaction to ensure both user and workspace member are created
    const newUser = await db.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role as Role,
        },
      });

      await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: user.id,
        },
      });

      return user;
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("POST User Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}