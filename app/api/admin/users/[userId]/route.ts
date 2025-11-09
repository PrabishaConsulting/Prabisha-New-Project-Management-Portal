import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Role } from "@/app/generated/client";
import { getCurrentUser } from "@/utils/getcurrentUser";

// ❗ Placeholder for your actual authentication/authorization logic
async function checkAdminAuth() {
  // TO_DO: Replace with your session validation logic (e.g., from next-auth)
  // Example:
  // const session = await getServerSession(authOptions);
  // if (!session?.user || session.user.role !== Role.ADMIN) {
  //   throw new Error('Not authorized');
  // }
  console.log("Auth check passed (placeholder)");
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
      return new NextResponse("Invalid role", { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/users/[userId] error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { userId } = await params;

    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Not allowed to access this user." },
        { status: 401 }
      );
    }

    const userRecord = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ role: userRecord.role });
  } catch (error: any) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Something went wrong", details: error.message },
      { status: 500 }
    );
  }
}