import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ workspaceId: null }, { status: 200 });
      
    }    const user = await db.user.findUnique({ where: { email: session?.user?.email } });
  
    if (!user) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user's workspaces
    const workspaces = await db.workspace.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } }
        ]
      }
    })

    // Get user's projects
    const projects = await db.project.findMany({
      where: {
        OR: [
          { createdBy: user.id },
          { members: { some: { userId: user.id } } }
        ]
      }
    })

    // Get user's tasks
    const tasks = await db.task.findMany({
      where: {
        OR: [
          { assigneeId: user.id },
          { reporterId: user.id }
        ]
      }
    })

    // Get total hours logged this week
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const timeEntries = await db.timeEntry.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startOfWeek
        }
      }
    })

    const totalHours = timeEntries.reduce((sum, entry) => sum + Number(entry.minutes), 0)

    return NextResponse.json({
      totalWorkspaces: workspaces.length,
      totalProjects: projects.length,
      totalTasks: tasks.length,
      totalHours: Math.round(totalHours * 100) / 100
    })
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 