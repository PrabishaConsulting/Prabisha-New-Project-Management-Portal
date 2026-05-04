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
    let conversationId = body.conversationId;
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

    if (conversationId) {
      const tConvCheck = timer('prisma: verify conversation');
      const existingConversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });
      tConvCheck.end();

      if (!existingConversation) {
        conversationId = null;
      } else if (existingConversation.projectId !== projectId) {
        return NextResponse.json(
          { error: 'Conversation does not belong to this project' },
          { status: 403 }
        );
      }
    }

    const tChain = timer('executeSearchChain');
    const result = await executeSearchChain({
      projectId,
      conversationId,
      userMessage: message,
      project,
      language,
      clientContext,
    });
    tChain.end();

    const responseData: any = {
      message: result.response,
      response: result.response,
      conversationId: result.conversationId,
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
    const query = searchParams.get('query');
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

    if (conversationId) {
      const tConv = timer('prisma: fetch conversation with messages');
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 }}
      });
      tConv.end();

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      if (conversation.projectId !== projectId) {
        return NextResponse.json(
          { error: 'Conversation does not belong to this project' },
          { status: 403 }
        );
      }

      tTotal.end();
      return NextResponse.json({
        data: conversation.messages,
        conversationId: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt
      });
    } else if (query) {
      const tSearch = timer('simpleSearch');
      const results = await simpleSearch(projectId, query, {
        limit: parseInt(searchParams.get('limit') || '10'),
        threshold: parseFloat(searchParams.get('threshold') || '0.65'),
        includeKnowledgeBaseNames: searchParams.get('includeKbNames') === 'true'
      });
      tSearch.end();

      tTotal.end();
      return NextResponse.json({ results, query, projectId, count: results.length });
    } else {
      // Get all conversations for this project
      const tConvs = timer('prisma: fetch conversations');
      const conversations = await prisma.conversation.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          }
        }
      });
      tConvs.end();

      tTotal.end();
      return NextResponse.json({ conversations, count: conversations.length });
    }

  } catch (error) {
    tTotal.end();
    console.error('Error in GET:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouterParams
) {
  const tTotal = timer('PUT [total]');
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const { conversationId, isActive, metadata } = body;

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

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const tUpdate = timer('prisma: update conversation');
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(metadata && { metadata }),
        ...(isActive === false && { endedAt: new Date() })
      }
    });
    tUpdate.end();

    // Verify the conversation belongs to this project
    if (conversation.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Conversation does not belong to this project' },
        { status: 403 }
      );
    }

    tTotal.end();
    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      isActive: conversation.isActive,
      endedAt: conversation.endedAt
    });

  } catch (error) {
    tTotal.end();
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
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

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const tDelete = timer('prisma: delete conversation');
    const conversation = await prisma.conversation.delete({
      where: { id: conversationId }
    });
    tDelete.end();

    // Verify the conversation belongs to this project
    if (conversation.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Conversation does not belong to this project' },
        { status: 403 }
      );
    }

    tTotal.end();
    return NextResponse.json({
      success: true,
      deleted: true,
      conversationId: conversation.id
    });

  } catch (error) {
    tTotal.end();
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}