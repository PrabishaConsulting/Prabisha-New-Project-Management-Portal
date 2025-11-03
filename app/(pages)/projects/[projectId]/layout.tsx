// @/app/projects/[projectId]/layout.tsx

import { ProjectNavigation } from './_components/project-navigation';
import { db } from '@/lib/db'; // adjust path to your prisma instance

export interface Tab {
  label: string;
  href: string;
  icon: string;
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  // ✅ Fetch workspaceId dynamically using Prisma

  const {projectId} = await params;
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true , name: true },
  });

  if (!project?.workspaceId) {
    throw new Error('Workspace not found for this project');
  }

  const workspaceId = project.workspaceId;

  // ✅ Build nav with dynamic workspaceId
  const projectNavItems: Tab[] = [
    {
      label: 'List',
      href: `/projects/${projectId}/list?workspaceId=${workspaceId}&page=1`,
      icon: 'LayoutList',
    },
    {
      label: 'Board',
      href: `/projects/${projectId}/board?workspaceId=${workspaceId}`,
      icon: 'KanbanSquare',
    },
    {
      label: 'Calendar',
      href: `/projects/${projectId}/calendar?workspaceId=${workspaceId}`,
      icon: 'Calendar',
    },
    {
      label: 'Files',
      href: `/projects/${projectId}/files?workspaceId=${workspaceId}`,
      icon: 'File',
    },
    {
      label: 'TimeLine',
      href: `/projects/${projectId}/project-timeline?workspaceId=${workspaceId}`,
      icon: 'LineChart',
    },
    {
      label: 'Notes',
      href: `/projects/${projectId}/notes?workspaceId=${workspaceId}`,
      icon: 'NotebookTabs',
    },
  ];

  return (
    <div>
      <header className="mb-4 pb-2">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{project.name}</h1>
        </div>
        <ProjectNavigation tabs={projectNavItems} />
      </header>
      <main>{children}</main>
    </div>
  );
}
