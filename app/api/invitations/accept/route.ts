import { NextRequest, NextResponse } from 'next/server';
import { ProjectRole, WorkspaceRole } from '@/app/generated/client';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized. Please log in to accept the invitation.' }), { status: 401 });
    }
    
    const currentUser = session.user as { id: string, email: string };
    const { token } = await request.json();

    if (!token) {
      return new NextResponse(JSON.stringify({ error: 'Invitation token is missing.' }), { status: 400 });
    }

    // Find the invitation
    const invitation = await db.workspaceInvitation.findUnique({
      where: { token },
    });

    if (!invitation || invitation.accepted || invitation.expiresAt < new Date()) {
      return new NextResponse(JSON.stringify({ error: 'This invitation is invalid or has expired.' }), { status: 404 });
    }

    if (invitation.email !== currentUser.email) {
      return new NextResponse(JSON.stringify({ error: 'This invitation is for a different email address.' }), { status: 403 });
    }

    // --- ATOMIC TRANSACTION ---
    await db.$transaction(async (tx) => {
      // 1. Add user to WorkspaceMember
      await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: currentUser.id,
          role: invitation.role,
        },
      });

      // 2. Mark invitation as accepted
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { accepted: true },
      });

      // 3. Find all projects in the workspace
      const projectsInWorkspace = await tx.project.findMany({
          where: { workspaceId: invitation.workspaceId },
          select: { id: true }
      });

      // 4. Add the new member to EVERY project in that workspace
      if (projectsInWorkspace.length > 0) {
        await tx.projectMember.createMany({
            data: projectsInWorkspace.map(project => ({
                projectId: project.id,
                userId: currentUser.id,
                role: ProjectRole.MEMBER, // Default role for projects
            })),
            skipDuplicates: true // In case of any edge cases
        });
      }
    });

    return NextResponse.json({ success: true, workspaceId: invitation.workspaceId });

  } catch (error) {
    console.error('[INVITATION_ACCEPT_POST]', error);
    // Handle potential unique constraint violation if user is already a member
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
        return new NextResponse(JSON.stringify({ error: 'You are already a member of this workspace.' }), { status: 409 });
    }
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}