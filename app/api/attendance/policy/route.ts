// app/api/attendance/policy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';

const policySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  lateGracePeriod: z.number(),
  allowedLateDays: z.number(),
  earlyExitGracePeriod: z.number(),
  workHoursPerDay: z.number(),
  overtimeStartAfter: z.number(),
  overtimeMultiplier: z.number(),
  halfDayHours: z.number(),
  applicableTo: z.string().optional(),
  applicableValue: z.string().optional()
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const policies = await prisma.attendancePolicy.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const activePolicy = policies.find(p => p.isActive);

    return NextResponse.json({
      policies,
      activePolicy
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const validatedData = policySchema.parse(body);

      const policy = await prisma.attendancePolicy.create({
        data: validatedData
      });

      return NextResponse.json({ success: true, data: policy });
    }

    if (action === 'activate') {
      const { policyId } = body;

      // Deactivate all policies
      await prisma.attendancePolicy.updateMany({
        where: {},
        data: { isActive: false }
      });

      // Activate selected policy
      const policy = await prisma.attendancePolicy.update({
        where: { id: policyId },
        data: { isActive: true }
      });

      return NextResponse.json({ success: true, data: policy });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error managing policy:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}