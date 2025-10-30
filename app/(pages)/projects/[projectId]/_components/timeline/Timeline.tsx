// components/timeline/Timeline.tsx
import { useMemo } from 'react';
import { Activity, TimelineFilters } from '@/types';
import TimelineItem from './TimelineItem';
import { Calendar } from 'lucide-react';

interface TimelineProps {
  activities: Activity[];
  filters: TimelineFilters;
}

export default function Timeline({ activities, filters }: TimelineProps) {
  const filteredActivities = useMemo(() => {
    return activities
      .filter(activity => {
        // Type filter
        if (filters.type !== 'all' && activity.type !== filters.type) {
          return false;
        }
        
        // User filter
        if (filters.user !== 'all' && activity.userId !== filters.user) {
          return false;
        }
        
        // Date range filter
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          if (new Date(activity.date) < fromDate) {
            return false;
          }
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999); // End of the day
          if (new Date(activity.date) > toDate) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activities, filters]);

  if (filteredActivities.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No activities found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters to see more results
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filteredActivities.map(activity => (
        <TimelineItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}