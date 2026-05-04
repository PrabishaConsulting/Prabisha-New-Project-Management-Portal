// app/api/projects/[projectId]/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { executeSearchChain, simpleSearch } from '@/lib/langchain/chains/search-chain';

function timer(label: string) {
  const start = Date.now();
  return {
    end: () => {
      const ms = Date.now() - start;
      console.log(`⏱️ [API /projects/[projectId]/chat] ${label}: ${ms}ms`);
      return ms;
    }
  };
}

interface RouterParams {
  params: Promise<{ projectId: string }>
}

export async function POST(
  request: NextRequest,
  context: RouterParams
) {
  const tTotal = timer('POST [total]');
  try {
    const { projectId } = await context.params;
    
    const tParse = timer('parse request body');
    const body = await request.json();
    tParse.end();

    const message = body.message || body.input;
    const language: string = body.language || 'en';
    const clientContext = {
      timezone: body.timezone,
      pageUrl: body.pageUrl,
      isReturning: body.isReturning,
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Check if user has access to this project
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tProjectFetch = timer('prisma: fetch project');
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
      include: {
        knowledgeBases: {
          select: { id: true, name: true, type: true }
        },
      }
    });
    tProjectFetch.end();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const tChain = timer('executeSearchChain');
    const result = await executeSearchChain({
      projectId,
      userMessage: message,
      project,
      language,
      clientContext,
    });
    tChain.end();

    const responseData: any = {
      message: result.response,
      response: result.response,
    };

    if (result.sourceUrls?.length) {
      responseData.sourceUrls = result.sourceUrls;
    }

    tTotal.end();
    return NextResponse.json(responseData);

  } catch (error: any) {
    tTotal.end();
    console.error('Chat API error:', error);

    let errorMessage = 'Failed to process message';
    let statusCode = 500;

    if (error.message?.includes('Project not found')) {
      errorMessage = 'Project not found';
      statusCode = 404;
    } else if (error.message?.includes('API key')) {
      errorMessage = 'AI service configuration error';
      statusCode = 503;
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded';
      statusCode = 429;
    }

    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: statusCode }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: RouterParams
) {
  const tTotal = timer('GET [total]');
  try {
    const { projectId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query')?.trim();

    // Check if user has access to this project
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const tSearch = timer('simpleSearch');
    const results = await simpleSearch(projectId, query, {
      limit: parseInt(searchParams.get('limit') || '10'),
      threshold: parseFloat(searchParams.get('threshold') || '0.65'),
      includeKnowledgeBaseNames: searchParams.get('includeKbNames') === 'true'
    });
    tSearch.end();

    tTotal.end();
    return NextResponse.json({ results, query, projectId, count: results.length });

  } catch (error) {
    tTotal.end();
    console.error('Error in GET:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouterParams
) {
  const tTotal = timer('DELETE [total]');
  try {
    const { projectId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');

    // Check if user has access to this project
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    tTotal.end();
    return NextResponse.json({
      success: true,
      deleted: true,
    });

  } catch (error) {
    tTotal.end();
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}