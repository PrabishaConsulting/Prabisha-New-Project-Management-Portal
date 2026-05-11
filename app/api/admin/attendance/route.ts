// app/api/admin/attendance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';

const verifyAttendanceSchema = z.object({
  attendanceId: z.string(),
  status: z.enum(['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT']),
  note: z.string().optional()
});

const manualEntrySchema = z.object({
  userId: z.string(),
  date: z.string(),
  checkInTime: z.string(),
  checkOutTime: z.string().optional(),
  status: z.enum(['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT']),
  note: z.string().optional()
});

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const departmentId = searchParams.get('departmentId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let whereClause: any = {};

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (status) {
      whereClause.status = status;
    }

    if (userId) {
      whereClause.userId = userId;
    } else {
      // Get users in department or all users
      const userWhere: any = {};
      if (departmentId) {
        userWhere.departmentId = departmentId;
      }
      
      const users = await prisma.user.findMany({
        where: userWhere,
        select: { id: true }
      });
      
      whereClause.userId = {
        in: users.map(u => u.id)
      };
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        breaks: true,
        verifiedByUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(attendances);
  } catch (error) {
    console.error('Error fetching attendances:', error);
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
    const { action } = body;

    if (action === 'verify') {
      const { attendanceId, status, note } = verifyAttendanceSchema.parse(body);

      const attendance = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          status,
          verifiedBy: admin.id,
          verifiedAt: new Date(),
          verificationNote: note
        }
      });

      // Create notification for user
      await prisma.notification.create({
        data: {
          type: 'ATTENDANCE_VERIFIED',
          message: `Your attendance for ${attendance.date.toLocaleDateString()} has been verified as ${status}`,
          recipients: {
            create: {
              recipientId: attendance.userId
            }
          }
        }
      });

      return NextResponse.json({ success: true, data: attendance });
    }

    if (action === 'manual-entry') {
      const { userId, date, checkInTime, checkOutTime, status, note } = manualEntrySchema.parse(body);

      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      const checkInDateTime = new Date(`${date}T${checkInTime}`);
      let checkOutDateTime = null;
      let workHours = null;

      if (checkOutTime) {
        checkOutDateTime = new Date(`${date}T${checkOutTime}`);
        workHours = (checkOutDateTime.getTime() - checkInDateTime.getTime()) / (1000 * 60 * 60);
      }

      const attendance = await prisma.attendance.upsert({
        where: {
          userId_date: {
            userId,
            date: attendanceDate
          }
        },
        update: {
          checkInTime: checkInDateTime,
          checkOutTime: checkOutDateTime,
          status,
          workHours,
          verifiedBy: admin.id,
          verifiedAt: new Date(),
          verificationNote: note
        },
        create: {
          userId,
          date: attendanceDate,
          checkInTime: checkInDateTime,
          checkOutTime: checkOutDateTime,
          status,
          workHours,
          verifiedBy: admin.id,
          verifiedAt: new Date(),
          verificationNote: note
        }
      });

      return NextResponse.json({ success: true, data: attendance });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating attendance:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}