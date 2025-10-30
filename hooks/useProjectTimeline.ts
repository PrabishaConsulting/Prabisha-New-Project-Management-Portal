// hooks/useProjectTimeline.ts
import useSWR from 'swr';
import { fetchProjectTimeline, calculateStats } from '@/lib/api';
import { Activity, Stats } from '@/types';

export function useProjectTimeline(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<Activity[]>(
    projectId ? `project-timeline-${projectId}` : null,
    () => fetchProjectTimeline(projectId),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const stats: Stats | undefined = data ? calculateStats(data) : undefined;

  return {
    activities: data,
    stats,
    isLoading,
    isError: error,
    mutate,
  };
}