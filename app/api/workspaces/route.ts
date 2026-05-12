import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Default workspace ID to assign to users without workspaces
const DEFAULT_WORKSPACE_ID = 'cme1bv47a0002js04h223pd0s';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ workspaces: [], currentWorkspace: null }, { status: 200 });
  }

  // Get user
  let user = await db.user.findUnique({ 
    where: { email: session.user.email },
    include: {
      workspaceMemberships: {
        include: {
          workspace: true
        }
      }
    }
  });
  
  if (!user) {
    return NextResponse.json({ workspaces: [], currentWorkspace: null }, { status: 200 });
  }

  // Get all workspaces where user is a member
  let workspaces = user.workspaceMemberships.map(m => ({ 
    id: m.workspace.id, 
    name: m.workspace.name 
  }));

  // If user has no workspaces, assign the default workspace
  if (workspaces.length === 0) {
    try {
      // Check if the default workspace exists
      const defaultWorkspace = await db.workspace.findUnique({
        where: { id: DEFAULT_WORKSPACE_ID }
      });

      if (defaultWorkspace) {
        // Create workspace membership for the user
        await db.workspaceMember.create({
          data: {
            workspaceId: DEFAULT_WORKSPACE_ID,
            userId: user.id,
            role: 'MEMBER', // You can change this to 'MEMBER' or 'ADMIN' as needed
          }
        });

        // Refresh user data to get the new membership
        user = await db.user.findUnique({ 
          where: { email: session.user.email },
          include: {
            workspaceMemberships: {
              include: {
                workspace: true
              }
            }
          }
        })!;

        workspaces = user?.workspaceMemberships.map(m => ({ 
          id: m.workspace.id, 
          name: m.workspace.name 
        })) || [];
      } else {
        console.error(`Default workspace ${DEFAULT_WORKSPACE_ID} not found`);
      }
    } catch (error) {
      console.error('Error assigning default workspace:', error);
      // Continue without workspace if error occurs
    }
  }

  // Pick the first workspace as current
  const currentWorkspace = workspaces[0] || null;

  return NextResponse.json({ workspaces, currentWorkspace }, { status: 200 });
}