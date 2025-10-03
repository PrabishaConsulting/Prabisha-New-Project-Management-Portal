// app/api/projects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/utils/getcurrentUser";

// --- GET /api/projects ---
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userData = await getCurrentUser();
    const userId = userData?.id;

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const departmentId = searchParams.get("departmentId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    const member = await db.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ **FIX APPLIED HERE**
    const where: Prisma.ProjectWhereInput = {
      workspaceId,
      AND: [
        // The 'mode' property has been removed.
        search ? { name: { contains: search } } : {},
        status && status !== "ALL" ? { status: status as any } : {},
        departmentId && departmentId !== "ALL" ? { departmentId } : {},
      ],
    };

    const [projectsFromDb, totalProjects] = await db.$transaction([
      db.project.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          creator: { select: { id: true, name: true, avatar: true } },
          department: { select: { id: true, name: true } },
          clientUser: { select: { id: true, name: true, avatar: true } },
          internalProduct: { select: { id: true, name: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
          _count: { select: { tasks: true } },
        },
      }),
      db.project.count({ where }),
    ]);

    const projects = projectsFromDb.map((p) => {
      // Find the lead member from the full list
      const leadMember = p.members.find((m) => m.role === "LEAD");
      const lead = leadMember ? leadMember.user : p.creator;
      const isUseraMember = p.members.some(
        (member) => member.user.id === userId
      );
      // Return the original project data (which includes the full members array)
      // and add the identified 'lead' property.
      return { ...p, lead , isUseraMember};
    });

   

    return NextResponse.json({
      projects,
      total: totalProjects,
      page,
      totalPages: Math.ceil(totalProjects / limit),
    });
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
