import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Role, Prisma } from "@/app/generated/client";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Extract query parameters
    const query = searchParams.get("query");
    const departmentId = searchParams.get("departmentId");
    const industry = searchParams.get("industry");
    const location = searchParams.get("location");
    const role = searchParams.get("role");
    const isActive = searchParams.get("isActive");

    // Build the where clause dynamically
    const whereClause: Prisma.UserWhereInput = {};

    // 1. Role Filter (Default to INTERNAL if not specified)
    if (role) {
      whereClause.role = role as Role;
    } else {
      whereClause.role = "INTERNAL";
    }

    // 2. Active Status Filter (Default to true if not specified)
    // If isActive is provided as 'false', filter by false.
    // If 'all' or specific logic needed, can adjust. Here we default to true.
    if (isActive !== null) {
      whereClause.isActive = isActive === "true";
    } else {
      whereClause.isActive = true;
    }

    // 3. Search Query (Name or Email)
    if (query) {
      whereClause.OR = [
        { name: { contains: query } }, // Case-insensitive handled by DB collation usually, or Prisma mode: 'insensitive'
        { email: { contains: query } },
      ];
    }

    // 4. Department Filter
    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    // 5. Industry Filter
    if (industry) {
      whereClause.industry = { contains: industry };
    }

    // 6. Location Filter
    if (location) {
      whereClause.location = { contains: location };
    }

    const internalUsers = await db.user.findMany({
      where: whereClause,
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        userCode: true,
        role: true,
        userType: true,
        isActive: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        industry: true,
        location: true,
      },
    });

    return NextResponse.json(internalUsers);
  } catch (error) {
    console.error("[INTERNAL_USERS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
