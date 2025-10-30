// components/layout/StatsCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stats } from '@/types';
import { BoxesIcon, MessageSquare, GitCompare, Users } from 'lucide-react';

interface StatsCardsProps {
  stats?: Stats;
}

export default function StatsCardsTimeline({ stats }: StatsCardsProps) {
  const statItems = [
    {
      title: 'Total Tasks',
      value: stats?.totalTasks,
      icon: BoxesIcon,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Comments',
      value: stats?.totalComments,
      icon: MessageSquare,
      color: 'bg-green-100 text-green-700',
    },
    {
      title: 'Status Changes',
      value: stats?.statusChanges,
      icon: GitCompare,
      color: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'Team Members',
      value: stats?.teamMembers,
      icon: Users,
      color: 'bg-purple-100 text-purple-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <div className={`p-2 rounded-md ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}