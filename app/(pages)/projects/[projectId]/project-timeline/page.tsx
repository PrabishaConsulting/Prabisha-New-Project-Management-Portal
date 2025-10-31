// app/projects/[projectId]/page.tsx
import { Suspense } from 'react';
import { ProjectTimeline } from './_components/project-timeline';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function TimelineLoading() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-gray-500">Loading project timeline...</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ProjectPage({ 
  params 
}: { 
  params: Promise<{ projectId: string }> 
}) {
  const { projectId } = await params;
  
  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Project Timeline</h1>
        <p className="text-gray-600 mt-2">View all activities and updates for this project</p>
      </div>
      
      <Suspense fallback={<TimelineLoading />}>
        <ProjectTimeline projectId={projectId} />
      </Suspense>
    </main>
  );
}