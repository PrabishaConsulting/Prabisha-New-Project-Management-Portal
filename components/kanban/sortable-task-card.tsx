'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { Task, Priority } from '@/app/generated/client';
import { format } from 'date-fns';
import Link from 'next/link';
import { useProject } from '@/context/project-context';


type TaskWithAssignee = Task & {
    assignee: {
      id: string;
      name: string | null;
      avatar: string | null;
    } | null;
  };

  interface SortableTaskCardProps {
    task: TaskWithAssignee;
    isOverlay?: boolean;
}

const priorityStyles: Record<Priority, string> = {
    URGENT: "bg-red-600", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-500", LOW: "bg-sky-500",
};


function TaskCard({ task  , projectId , workspaceId}: { task: TaskWithAssignee , projectId : string  , workspaceId : string}) {
    return (
        <Link href={`/projects/${projectId}/task/${task.id}?workspaceId=${workspaceId}`}>
    <Card className="bg-card border-border hover:bg-accent hover:scale-105">
      <CardContent className="p-3">
        <p className="font-semibold text-sm text-card-foreground">{task.title}</p>
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-2">
            <Badge className={cn('text-white text-xs', priorityStyles[task.priority])}>
              {task.priority}
            </Badge>
            {task.dueDate && (
                <Badge variant="outline" className="text-xs">
                {format(new Date(task.dueDate), 'd MMM')}
              </Badge>
            )}
          </div>
          {task.assignee ? (
              <Avatar className="h-6 w-6">
              <AvatarImage className='object-cover' src={task.assignee.avatar || ''} alt={task.assignee.name || 'User'} />
              <AvatarFallback>{task.assignee.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      </CardContent>
    </Card>
          </Link>
  );
}

export function SortableTaskCard({ task, isOverlay }: SortableTaskCardProps) {
    const { workspaceId, projectId } = useProject();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: { type: 'Task', task },
    });
    
    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };
    
    if (isOverlay) {
        return <div className="cursor-grabbing"><TaskCard task={task} projectId={projectId}  workspaceId={workspaceId} /></div>;
    }
    
    return (
        <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners}
        className={cn("cursor-grab", isDragging ? "opacity-30" : "opacity-100")}
    >
      <TaskCard task={task} projectId={projectId} workspaceId={workspaceId} />
    </div>
  );
}