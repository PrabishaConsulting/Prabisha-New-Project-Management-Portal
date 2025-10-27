// app/api/projects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/utils/helper-server-function"; // Assuming this is the correct path
import { Prisma } from "@/app/generated/client";
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

   




    // ✅ **FIX APPLIED HERE**


    const [projectsFromDb, totalProjects] = await db.$transaction([
      db.project.findMany({
        include: {
          creator: { select: { id: true, name: true, avatar: true } },
          department: { select: { id: true, name: true } },
          members: {
            where: { role: "LEAD" },
            include: { user: { select: { id: true, name: true, avatar: true } } },
          },
        },
      }),
      db.project.count(),
    ]);

    const projects = projectsFromDb.map((p) => {
      const lead = p.members.length > 0 ? p.members[0].user : p.creator;
      const { members, ...projectData } = p;
      return { ...projectData, lead };
    });

    return NextResponse.json(
      projects,
    );

  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
