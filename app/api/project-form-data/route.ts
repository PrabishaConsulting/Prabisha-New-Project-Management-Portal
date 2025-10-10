// app/api/project-form-data/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    // Fetch departments
    const departments = await db.department.findMany({
      orderBy: { name: "asc" },
    });

    // Fetch clients (users with userType=CLIENT)
    const clients = await db.user.findMany({
      where: { userType: "CLIENT" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Fetch internal products
    const internalProducts = await db.internalProduct.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    // Fetch workspace members with user details
    const workspaceMembers = await db.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return NextResponse.json({
      departments,
      clients,
      internalProducts,
      workspaceMembers,
    });
  } catch (error) {
    console.error("Failed to fetch project form data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}