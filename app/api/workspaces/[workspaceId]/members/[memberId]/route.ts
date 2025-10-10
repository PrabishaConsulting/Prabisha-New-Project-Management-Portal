// app/api/workspaces/[workspaceId]/members/[memberId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, memberId } = await params;

    console.log(workspaceId , memberId)

    // Check if the current user is an admin of the workspace
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    console.log(currentUser , "data")

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const workspaceMember = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: currentUser.id },
      },
    });

    if (!workspaceMember || workspaceMember.role !== "MEMBER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // First, try to update a workspace member

      // If not found, try to update an invitation (archive it by setting expiresAt to now)
      console.log( "data")
      try {
        const updatedInvitation = await db.workspaceInvitation.update({
          where: { id: memberId },
          data: { expiresAt: new Date() }, // Archive by setting expiration to now
        });

        console.log(updatedInvitation , "data")
        return NextResponse.json(updatedInvitation);
      } catch (error) {
        return NextResponse.json({ error: "Member or invitation not found" }, { status: 404 });
      }
    
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, memberId } = await params;

    // Check if the current user is an admin of the workspace
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const workspaceMember = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: currentUser.id },
      },
    });

    if (!workspaceMember || workspaceMember.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // First, try to delete a workspace member
    try {
      await db.workspaceMember.delete({
        where: { id: memberId },
      });
      return NextResponse.json({ success: true });
    } catch (error) {
      // If not found, try to delete an invitation
      try {
        await db.workspaceInvitation.delete({
          where: { id: memberId },
        });
        return NextResponse.json({ success: true });
      } catch (error) {
        return NextResponse.json({ error: "Member or invitation not found" }, { status: 404 });
      }
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}