// components/timeline/TimelineItem.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Activity } from '@/types';
import { format } from 'date-fns';

interface TimelineItemProps {
  activity: Activity;
}

export default function TimelineItem({ activity }: TimelineItemProps) {
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'comment':
        return 'default';
      case 'status_changed':
        return 'secondary';
      case 'task_created':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'comment':
        return 'Comment';
      case 'status_changed':
        return 'Status Change';
      case 'task_created':
        return 'Task Created';
      default:
        return 'Activity';
    }
  };

  return (
    <div className="relative pl-8 pb-8 border-l-2 border-muted last:border-0 last:pb-0">
      {/* Timeline marker */}
      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary"></div>
      
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.user.avatar || undefined} />
                <AvatarFallback>
                  {activity.user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{activity.user.name}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(activity.date), 'MMM d, yyyy • h:mm a')}
                </div>
              </div>
            </div>
            <Badge variant={getBadgeVariant(activity.type)}>
              {getActivityTypeLabel(activity.type)}
            </Badge>
          </div>
          
          <p className="text-sm mb-2">{activity.description}</p>
          
          {activity.type === 'comment' && activity.details.content && (
            <div className="mt-2 p-3 bg-muted rounded-md text-sm">
              {activity.details.content}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}