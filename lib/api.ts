// lib/api.ts
import { Activity } from '@/types';

const API_BASE_URL = 'https://projects.prabisha.com/api';

export async function fetchProjectTimeline(projectId: string): Promise<Activity[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/timeline`);
  if (!response.ok) {
    throw new Error('Failed to fetch project timeline');
  }
  return response.json();
}

export function calculateStats(activities: Activity[]) {
  const stats = {
    totalTasks: 0,
    totalComments: 0,
    statusChanges: 0,
    teamMembers: new Set<string>(),
  };

  activities.forEach(activity => {
    stats.teamMembers.add(activity.userId);
    
    switch (activity.type) {
      case 'task_created':
        stats.totalTasks += 1;
        break;
      case 'comment':
        stats.totalComments += 1;
        break;
      case 'status_changed':
        stats.statusChanges += 1;
        break;
    }
  });

  return {
    ...stats,
    teamMembers: stats.teamMembers.size,
  };
}