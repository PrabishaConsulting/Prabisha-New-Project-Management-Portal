// app/api/projects/[projectId]/timeline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProjectTimeline } from '@/services/timeline-services/timeline.service';

// Default pagination values
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Extract projectId from params
    const { projectId } = await params;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Extract query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(Number(searchParams.get('limit')) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );
    const cursor = searchParams.get('cursor') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const status = searchParams.get('status') || undefined;
    const assigneeId = searchParams.get('assigneeId') || undefined;

    // Prepare filters object
    const filters = {
      ...(userId && { userId }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(status && { status }),
      ...(assigneeId && { assigneeId }),
    };

    // Prepare pagination options
    const pagination = {
      cursor,
      limit,
    };

    // Fetch timeline data with pagination
    const timeline = await getProjectTimeline(projectId, filters, pagination);

    // Return response with pagination metadata
    return NextResponse.json(timeline);
  } catch (error) {
    console.error('Error fetching project timeline:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Invalid cursor')) {
        return NextResponse.json(
          { error: 'Invalid pagination cursor' },
          { status: 400 }
        );
      }
    }
    
    // Generic server error
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}