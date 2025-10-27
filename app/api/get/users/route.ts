import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserType } from "@/app/generated/client"; // Import your enum type

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userTypeParam = searchParams.get("userType");

    let whereClause = {};

    // Build the query only if a valid userType is provided
    if (userTypeParam && Object.values(UserType).includes(userTypeParam as UserType)) {
      whereClause = { userType: userTypeParam as UserType };
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        departmentId: true,
        userType: true,
      },
    });

    // If a filter was applied and resulted in no users, return 404
    if (userTypeParam && users.length === 0) {
      return NextResponse.json([]);
    }

    // Otherwise, return the users (or an empty array if no filter was used)
    return NextResponse.json(users);
    
  } catch (error) {
    console.error("[USERS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}