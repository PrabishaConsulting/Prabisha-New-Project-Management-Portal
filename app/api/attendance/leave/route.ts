// app/api/leave/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';

const createLeaveSchema = z.object({
  type: z.enum(['ANNUAL', 'SICK', 'CASUAL', 'UNPAID', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'STUDY', 'OTHER']),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(1),
  halfDay: z.boolean().optional(),
  halfDaySession: z.enum(['MORNING', 'AFTERNOON']).optional(),
  attachments: z.array(z.string()).optional()
});

const updateLeaveSchema = z.object({
  leaveId: z.string(),
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  rejectionReason: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const validatedData = createLeaveSchema.parse(body);
      
      const startDate = new Date(validatedData.startDate);
      const endDate = new Date(validatedData.endDate);

      // Check for overlapping leave requests
      const overlappingLeave = await prisma.leaveRequest.findFirst({
        where: {
          userId: user.id,
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [
            { startDate: { lte: endDate }, endDate: { gte: startDate } }
          ]
        }
      });

      if (overlappingLeave) {
        return NextResponse.json(
          { error: 'You already have a leave request in this period' },
          { status: 400 }
        );
      }

      // Check for holidays
      const holidays = await prisma.holiday.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          userId: user.id,
          type: validatedData.type,
          startDate,
          endDate,
          reason: validatedData.reason,
          halfDay: validatedData.halfDay || false,
          halfDaySession: validatedData.halfDaySession,
          attachments: validatedData.attachments ? JSON.stringify(validatedData.attachments) : null,
          status: 'PENDING'
        }
      });

      // Notify admin/managers
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MANAGER'] } }
      });

      await prisma.notification.create({
        data: {
          type: 'LEAVE_REQUEST',
          message: `New leave request from ${user.name} from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
          url: `/admin/leave/${leaveRequest.id}`,
          recipients: {
            create: admins.map(admin => ({
              recipientId: admin.id
            }))
          }
        }
      });

      return NextResponse.json({ success: true, data: leaveRequest });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Leave request error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const year = searchParams.get('year');
    const all = searchParams.get('all') === 'true';

    const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGER';
    let whereClause: any = {};

    if (all && isAdmin) {
      // Admins can see all requests if 'all' flag is present
    } else {
      // Otherwise, only see own requests
      whereClause.userId = user.id;
    }

    if (status) {
      whereClause.status = status;
    }

    if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31);
      whereClause.startDate = { gte: startDate };
      whereClause.endDate = { lte: endDate };
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate leave balances
    const leaveBalances = await calculateLeaveBalances(user.id, new Date().getFullYear());

    return NextResponse.json({
      requests: leaveRequests,
      balances: leaveBalances
    });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { leaveId, status, rejectionReason } = updateLeaveSchema.parse(body);

    const leaveRequest = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status,
        approvedBy: status === 'APPROVED' ? admin.id : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null
      },
      include: { user: true }
    });

    // Notify the user
    await prisma.notification.create({
      data: {
        type: 'LEAVE_REQUEST_UPDATED',
        message: `Your leave request from ${leaveRequest.startDate.toLocaleDateString()} to ${leaveRequest.endDate.toLocaleDateString()} has been ${status.toLowerCase()}`,
        recipients: {
          create: {
            recipientId: leaveRequest.userId
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: leaveRequest });
  } catch (error) {
    console.error('Error updating leave request:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function calculateLeaveBalances(userId: string, year: number) {
  // This is a simplified calculation - adjust based on your company policy
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      startDate: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31)
      }
    }
  });

  const totalDaysTaken = approvedLeaves.reduce((sum, leave) => {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return sum + (leave.halfDay ? days * 0.5 : days);
  }, 0);

  return {
    ANNUAL: { total: 20, used: totalDaysTaken, remaining: Math.max(0, 20 - totalDaysTaken) },
    SICK: { total: 12, used: 0, remaining: 12 },
    CASUAL: { total: 5, used: 0, remaining: 5 },
    UNPAID: { total: 0, used: 0, remaining: 0 }
  };
}