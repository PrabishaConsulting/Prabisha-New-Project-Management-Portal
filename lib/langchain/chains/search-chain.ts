// lib/langchain/chains/search-chain.ts
import { prisma } from '@/lib/prisma';

export async function executeSearchChain(query: string, projectId: string) {
  // Simple search implementation
  const results = await prisma.knowledgeBase.findMany({
    where: {
      projectId,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 10,
  });

  return results;
}

export async function simpleSearch(query: string, projectId: string) {
  return executeSearchChain(query, projectId);
}
