// app/api/attendance/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendances = await prisma.attendance.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: { breaks: true }
    });

    // Calculate statistics
    const totalDays = attendances.length;
    const presentDays = attendances.filter(a => a.status === 'PRESENT').length;
    const lateDays = attendances.filter(a => a.isLate).length;
    const halfDays = attendances.filter(a => a.status === 'HALF_DAY').length;
    const absentDays = 0; // Calculate based on expected working days
    const onLeaveDays = 0; // Calculate from leave requests

    const totalWorkHours = attendances.reduce((sum, a) => sum + (a.workHours || 0), 0);
    const totalOvertime = attendances.reduce((sum, a) => sum + (a.overtime || 0), 0);
    const totalLateMinutes = attendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);

    // Get leave requests for the month
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        userId: user.id,
        status: 'APPROVED',
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } }
        ]
      }
    });

    const leaveDays = leaveRequests.reduce((sum, leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    // Get holidays
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Calculate attendance percentage
    const expectedWorkingDays = 22; // You can calculate based on working days configuration
    const attendancePercentage = expectedWorkingDays > 0 
      ? ((presentDays + halfDays * 0.5) / expectedWorkingDays) * 100 
      : 0;

    return NextResponse.json({
      summary: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        halfDays,
        onLeaveDays: leaveDays,
        holidays: holidays.length,
        attendancePercentage: attendancePercentage.toFixed(2)
      },
      hours: {
        totalWorkHours: totalWorkHours.toFixed(2),
        totalOvertime: totalOvertime.toFixed(2),
        averageWorkHours: totalDays > 0 ? (totalWorkHours / totalDays).toFixed(2) : 0
      },
      penalties: {
        totalLateMinutes,
        lateDaysCount: lateDays,
        latePenalty: calculateLatePenalty(lateDays)
      },
      daily: attendances.map(a => ({
        date: a.date,
        status: a.status,
        checkInTime: a.checkInTime,
        checkOutTime: a.checkOutTime,
        workHours: a.workHours,
        isLate: a.isLate,
        lateMinutes: a.lateMinutes,
        breaks: a.breaks
      })),
      leaveRequests,
      holidays
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateLatePenalty(lateDays: number): number {
  // Example penalty calculation: $10 per late day after 3 days
  if (lateDays <= 3) return 0;
  return (lateDays - 3) * 10;
}