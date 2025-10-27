// app/api/projects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/utils/helper-server-function";
import { Prisma, ProjectRole } from "@/app/generated/client";

// --- GET /api/projects ---
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userData = await getUserByEmail(session.user.email);
    const userId = userData.user?.id;

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

    const where: Prisma.ProjectWhereInput = {
      workspaceId,
      AND: [
        {
          OR: [{ createdBy: userId }, { members: { some: { userId } } }],
        },
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

    // ✅ **MODIFIED LOGIC HERE**
    const projects = projectsFromDb.map((p) => {
      const leadMember = p.members.find((m) => m.role === "LEAD");
      const lead = leadMember ? leadMember.user : p.creator;

      // Determine the current user's role with the correct priority
      let isUseraMember: ProjectRole | "CREATOR" | null = null;
      const membership = p.members.find((m) => m.userId === userId);

      // Priority 1: Check if the user is a LEAD.
      if (membership?.role === "LEAD") {
        isUseraMember = "LEAD";
      }
      // Priority 2: If not a LEAD, check if they are the CREATOR.
      else if (p.createdBy === userId) {
        isUseraMember = "CREATOR";
      }
      // Priority 3: If neither, check for any other membership role (e.g., MEMBER).
      else if (membership) {
        isUseraMember = membership.role;
      }

      return { ...p, lead, isUseraMember };
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
