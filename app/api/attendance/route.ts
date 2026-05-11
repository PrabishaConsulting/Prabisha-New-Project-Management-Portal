// app/api/attendance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';

const checkInSchema = z.object({
  note: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string()
  }).optional(),
  ipAddress: z.string().optional(),
  deviceInfo: z.string().optional()
});

const checkOutSchema = z.object({
  note: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string()
  }).optional()
});

const breakSchema = z.object({
  action: z.enum(['start', 'end']),
  type: z.enum(['LUNCH', 'BREAK', 'MEETING', 'TRAINING', 'PERSONAL']).optional(),
  note: z.string().optional()
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

    // Handle Check-in
    if (action === 'checkin') {
      const validatedData = checkInSchema.parse(body);
      
      // Get current time in UTC
      const now = new Date();
      
      // Calculate IST time (UTC + 5:30)
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      
      // Create a date object for today in UTC (without time component)
      // Using IST date to determine "today"
      const todayUTC = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));
      
      console.log('Check-in details:', {
        currentUTC: now.toISOString(),
        istNow: istNow.toISOString(),
        dateToStore: todayUTC.toISOString(),
      });

      // Check if already checked in today using UTC date
      const existingAttendance = await prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: todayUTC
          }
        }
      });

      if (existingAttendance) {
        return NextResponse.json(
          { error: 'Already checked in today' },
          { status: 400 }
        );
      }

      // Get attendance policy for late calculation
      const policy = await prisma.attendancePolicy.findFirst({
        where: { isActive: true }
      });

      // Calculate late based on business hours (9 AM IST)
      const expectedStartHour = 9;
      const expectedStartMinute = 0;
      const graceMinutes = policy?.lateGracePeriod || 15;
      
      const istHour = istNow.getUTCHours();
      const istMinute = istNow.getUTCMinutes();
      
      const isLate = istHour > expectedStartHour || (istHour === expectedStartHour && istMinute > expectedStartMinute + graceMinutes);
      
      let lateMinutes = 0;
      if (isLate) {
        lateMinutes = (istHour - expectedStartHour) * 60 + (istMinute - expectedStartMinute);
      }

      const attendance = await prisma.attendance.create({
        data: {
          userId: user.id,
          date: todayUTC, 
          checkInTime: now, 
          checkInNote: validatedData.note,
          isLate,
          lateMinutes: isLate ? lateMinutes : null,
          location: validatedData.location ? JSON.stringify(validatedData.location) : null,
          ipAddress: validatedData.ipAddress,
          deviceInfo: validatedData.deviceInfo,
          status: isLate ? 'LATE' : 'PRESENT'
        }
      });

      console.log('Created attendance:', {
        id: attendance.id,
        date: attendance.date.toISOString(),
        checkInTime: attendance.checkInTime.toISOString()
      });

      // Create activity log
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          projectId: null,
          action: 'ATTENDANCE_CHECKIN',
          description: `Checked in at ${now.toLocaleTimeString()}`,
          metadata: JSON.stringify({ isLate, lateMinutes, date: todayUTC.toISOString() })
        }
      });

      return NextResponse.json({ success: true, data: attendance });
    }

    // Handle Check-out
    if (action === 'checkout') {
      const validatedData = checkOutSchema.parse(body);
      
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      const todayUTC = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));

      const attendance = await prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: todayUTC
          }
        },
        include: { breaks: true }
      });

      if (!attendance) {
        return NextResponse.json(
          { error: 'No check-in found for today' },
          { status: 400 }
        );
      }

      if (attendance.checkOutTime) {
        return NextResponse.json(
          { error: 'Already checked out today' },
          { status: 400 }
        );
      }

      const checkOutTime = now;
      
      // Calculate work hours
      let workHours = (checkOutTime.getTime() - attendance.checkInTime.getTime()) / (1000 * 60 * 60);
      
      // Subtract break durations
      const totalBreakMinutes = attendance.breaks.reduce((total, breakItem) => {
        if (breakItem.endTime) {
          return total + (breakItem.endTime.getTime() - breakItem.startTime.getTime()) / (1000 * 60);
        }
        return total;
      }, 0);
      
      workHours -= totalBreakMinutes / 60;
      workHours = Math.max(0, parseFloat(workHours.toFixed(2)));

      // Get policy for overtime calculation
      const policy = await prisma.attendancePolicy.findFirst({
        where: { isActive: true }
      });
      
      const expectedHours = policy?.workHoursPerDay || 8;
      const overtime = workHours > expectedHours ? parseFloat((workHours - expectedHours).toFixed(2)) : 0;

      // Check for early exit (5 PM IST)
      const expectedEndHour = 17;
      const expectedEndMinute = 0;
      
      const istHour = istNow.getUTCHours();
      const istMinute = istNow.getUTCMinutes();
      
      const earlyExit = istHour < expectedEndHour || (istHour === expectedEndHour && istMinute < expectedEndMinute);
      
      let earlyExitMinutes = 0;
      if (earlyExit) {
        earlyExitMinutes = (expectedEndHour - istHour) * 60 + (expectedEndMinute - istMinute);
      }

      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutTime,
          checkOutNote: validatedData.note,
          workHours,
          overtime,
          earlyExit,
          earlyExitMinutes: earlyExit ? earlyExitMinutes : null,
          status: workHours >= (policy?.halfDayHours || 4) ? 'PRESENT' : 'HALF_DAY'
        }
      });

      // Create activity log - FIXED: added projectId: null and used todayUTC instead of today
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          projectId: null, // Added this
          action: 'ATTENDANCE_CHECKOUT',
          description: `Checked out at ${new Date().toLocaleTimeString()}. Worked ${workHours} hours`,
          metadata: JSON.stringify({ workHours, overtime, date: todayUTC.toISOString() }) // Changed 'today' to 'todayUTC'
        }
      });

      return NextResponse.json({ success: true, data: updatedAttendance });
    }

    // Handle Break actions
    if (action === 'break') {
      const { action: breakAction, type = 'BREAK', note } = breakSchema.parse(body);
      
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      const todayUTC = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));

      const attendance = await prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: todayUTC
          }
        }
      });

      if (!attendance) {
        return NextResponse.json(
          { error: 'No check-in found for today' },
          { status: 400 }
        );
      }

      if (breakAction === 'start') {
        // Check if there's an ongoing break
        const ongoingBreak = await prisma.break.findFirst({
          where: {
            attendanceId: attendance.id,
            endTime: null
          }
        });

        if (ongoingBreak) {
          return NextResponse.json(
            { error: 'Already on a break. End current break first.' },
            { status: 400 }
          );
        }

        const newBreak = await prisma.break.create({
          data: {
            attendanceId: attendance.id,
            startTime: new Date(),
            type,
            duration: null
          }
        });

        // Optional: Log break start activity
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            projectId: null,
            action: 'BREAK_START',
            description: `Started ${type} break`,
            metadata: JSON.stringify({ breakId: newBreak.id, breakType: type })
          }
        }).catch(console.error); // Don't fail if activity log fails

        return NextResponse.json({ success: true, data: newBreak });
      } 
      else if (breakAction === 'end') {
        const ongoingBreak = await prisma.break.findFirst({
          where: {
            attendanceId: attendance.id,
            endTime: null
          }
        });

        if (!ongoingBreak) {
          return NextResponse.json(
            { error: 'No ongoing break found' },
            { status: 400 }
          );
        }

        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - ongoingBreak.startTime.getTime()) / (1000 * 60));

        const updatedBreak = await prisma.break.update({
          where: { id: ongoingBreak.id },
          data: {
            endTime,
            duration
          }
        });

        // Optional: Log break end activity
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            projectId: null,
            action: 'BREAK_END',
            description: `Ended break after ${duration} minutes`,
            metadata: JSON.stringify({ breakId: ongoingBreak.id, duration })
          }
        }).catch(console.error);

        return NextResponse.json({ success: true, data: updatedBreak });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Attendance API error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.flatten() }, { status: 400 });
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month');
    const status = searchParams.get('status');

    let whereClause: any = { userId: user.id };

    if (startDate && endDate) {
      // Fix timezone issues - create dates at UTC midnight
      const startDateTime = new Date(startDate);
      startDateTime.setUTCHours(0, 0, 0, 0);
      
      const endDateTime = new Date(endDate);
      endDateTime.setUTCHours(23, 59, 59, 999);
      
      whereClause.date = {
        gte: startDateTime,
        lte: endDateTime
      };
      
      console.log('Date filter:', {
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString()
      });
    } else if (month) {
      const [year, monthNum] = month.split('-');
      // Create dates in UTC
      const start = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 1));
      const end = new Date(Date.UTC(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999));
      whereClause.date = { gte: start, lte: end };
    }

    if (status) {
      whereClause.status = status;
    }

    // Debug: Check all attendances for user
    const allUserAttendances = await prisma.attendance.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 5
    });
    console.log('Last 5 attendances for user:', allUserAttendances.map(a => ({
      date: a.date,
      dateISO: a.date.toISOString(),
      checkInTime: a.checkInTime
    })));

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { 
        breaks: true,
        verifiedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    console.log('Filtered attendances count:', attendances.length);

    // Get attendance statistics
    const stats = await prisma.attendance.aggregate({
      where: whereClause,
      _sum: {
        workHours: true,
        overtime: true,
        lateMinutes: true
      },
      _count: true
    });

    return NextResponse.json({
      data: attendances,
      stats: {
        totalDays: stats._count,
        totalWorkHours: stats._sum.workHours || 0,
        totalOvertime: stats._sum.overtime || 0,
        totalLateMinutes: stats._sum.lateMinutes || 0
      }
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}