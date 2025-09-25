import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create a test user
  const hashedPassword = await hashPassword('password123')
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  // Create a workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo Workspace',
      description: 'A demo workspace for testing',
      ownerId: user.id,
    },
  })

  // Add user as workspace member
  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'OWNER',
    },
  })

  // Create a project
  const project = await prisma.project.create({
    data: {
      name: 'Demo Project',
      description: 'A demo project for testing the application',
      workspaceId: workspace.id,
      createdBy: user.id,
      status: 'ACTIVE',
      priority: 'MEDIUM',
    },
  })

  // Add user as project member
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: user.id,
      role: 'LEAD',
    },
  })

  // Create default columns
  const columns = await Promise.all([
    prisma.column.create({
      data: {
        name: 'To Do',
        projectId: project.id,
        position: 0,
        color: '#6B7280',
      },
    }),
    prisma.column.create({
      data: {
        name: 'In Progress',
        projectId: project.id,
        position: 1,
        color: '#3B82F6',
      },
    }),
    prisma.column.create({
      data: {
        name: 'Review',
        projectId: project.id,
        position: 2,
        color: '#F59E0B',
      },
    }),
    prisma.column.create({
      data: {
        name: 'Done',
        projectId: project.id,
        position: 3,
        color: '#10B981',
      },
    }),
  ])

  // Create some sample tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Set up project structure',
        description: 'Initialize the project with proper folder structure and configuration',
        columnId: columns[0].id,
        projectId: project.id,
        reporterId: user.id,
        position: 0,
        priority: 'HIGH',
        status: 'TO_DO',
        estimatedHours: 4,
        actualHours: 0,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Design user interface',
        description: 'Create wireframes and mockups for the user interface',
        columnId: columns[1].id,
        projectId: project.id,
        reporterId: user.id,
        position: 0,
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        estimatedHours: 8,
        actualHours: 2,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Implement authentication',
        description: 'Set up user authentication and authorization system',
        columnId: columns[2].id,
        projectId: project.id,
        reporterId: user.id,
        position: 0,
        priority: 'HIGH',
        status: 'REVIEW',
        estimatedHours: 6,
        actualHours: 6,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Write documentation',
        description: 'Create comprehensive documentation for the project',
        columnId: columns[3].id,
        projectId: project.id,
        reporterId: user.id,
        position: 0,
        priority: 'LOW',
        status: 'DONE',
        estimatedHours: 3,
        actualHours: 3,
      },
    }),
  ])

  // Create some sample time entries
  await Promise.all([
    prisma.timeEntry.create({
      data: {
        taskId: tasks[1].id,
        userId: user.id,
        description: 'Initial design work',
        hours: 2,
        date: new Date(),
      },
    }),
    prisma.timeEntry.create({
      data: {
        taskId: tasks[2].id,
        userId: user.id,
        description: 'Authentication implementation',
        hours: 6,
        date: new Date(),
      },
    }),
    prisma.timeEntry.create({
      data: {
        taskId: tasks[3].id,
        userId: user.id,
        description: 'Documentation writing',
        hours: 3,
        date: new Date(),
      },
    }),
  ])

  // Create some sample comments
  await Promise.all([
    prisma.taskComment.create({
      data: {
        taskId: tasks[0].id,
        userId: user.id,
        content: 'This task is ready to be started. Let me know if you need any clarification.',
      },
    }),
    prisma.taskComment.create({
      data: {
        taskId: tasks[1].id,
        userId: user.id,
        content: 'Design is progressing well. Should be ready for review soon.',
      },
    }),
  ])

  // Create some sample activity logs
  await Promise.all([
    prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: project.id,
        action: 'project_created',
        description: 'Created new project: Demo Project',
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: project.id,
        taskId: tasks[0].id,
        action: 'task_created',
        description: 'Created task: Set up project structure',
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: user.id,
        projectId: project.id,
        taskId: tasks[1].id,
        action: 'task_moved',
        description: 'Moved task to In Progress',
      },
    }),
  ])

  console.log('✅ Database seeded successfully!')
  console.log('📧 Test user email: admin@example.com')
  console.log('🔑 Test user password: password123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 