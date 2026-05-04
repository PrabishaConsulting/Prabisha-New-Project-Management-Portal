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
    const body = await request.json();
    const { status } = body; // Expecting 'Active' or 'Archived'

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

    // if (!workspaceMember || workspaceMember.role !== "ADMIN") {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    // Try to update a workspace member first
    try {
      if (status === 'Archived') {
        // For archiving: delete the workspace member
        await db.workspaceMember.delete({
          where: { id: memberId },
        });
        return NextResponse.json({ success: true, message: "Member archived successfully" });
      } else if (status === 'Active') {
        // For unarchiving: this would require re-creating the member or updating a status field
        // Since you don't have a status field on workspaceMember, you'll need to determine
        // how to handle unarchiving. One approach is to add a status field to workspaceMember.
        // For now, I'll assume you have a way to restore archived members.
        // If you don't have an "archived" concept in workspaceMember, you might need to
        // re-invite them instead.
        return NextResponse.json({ error: "Unarchiving not implemented for workspace members" }, { status: 400 });
      }
    } catch (error) {
      // If not found in workspaceMember, try to update an invitation
      try {
        if (status === 'Archived') {
          // Archive invitation by setting expiration to now
          const updatedInvitation = await db.workspaceInvitation.update({
            where: { id: memberId },
            data: { expiresAt: new Date() },
          });
          return NextResponse.json(updatedInvitation);
        } else if (status === 'Active') {
          // Unarchive invitation - you might want to extend the expiration date
          const updatedInvitation = await db.workspaceInvitation.update({
            where: { id: memberId },
            data: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days from now
          });
          return NextResponse.json(updatedInvitation);
        }
      } catch (error) {
        console.error("Error while processing request:", error);
        return NextResponse.json({ error: "Member or invitation not found" }, { status: 404 });
      }
    }
    
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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