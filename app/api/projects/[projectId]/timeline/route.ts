import { NextRequest, NextResponse } from 'next/server';
import { getProjectTimeline } from '@/services/timeline-services/timeline.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const {projectId} = await params
  if(projectId == undefined) {
    return NextResponse.json({error : "projectId must be valid"})
  }
  try {
    const timeline = await getProjectTimeline(projectId);
    return NextResponse.json(timeline);
  } catch (error) {
    console.error('Error fetching project timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}