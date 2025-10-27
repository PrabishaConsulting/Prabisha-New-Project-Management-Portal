// app/dashboard/_components/Dashboard.tsx
import { TaskPriorityChart } from "./task-priority-chart";
import { DepartmentPendingTasksChart } from "./task-status-chart";
import { DashboardWrapper } from "./task-status-wrapper";
import { TaskCompletionTrend } from "./TaskCompletionTrend";
import { LiveActivity } from "./User-live-activity";
import YouTubeMarquee from "./YouTube-Marquee";

export const Dashboard = ({
  TodaysActivity,
  pendingTasks,
  tasksByPriority,
  taskCompletionTrend,
  departments,
}: {
  TodaysActivity: any;
  pendingTasks: any;
  tasksByPriority: any;
  taskCompletionTrend: Array<{
    date: string;
    created: number;
    completed: number;
  }>;
  departments: any;
}) => {
  if (!TodaysActivity || !pendingTasks) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="lg:col-span-2">
        <YouTubeMarquee/>
      </div>
      <div className="lg:col-span-1">
        <LiveActivity initialActivities={TodaysActivity || []} />
      </div>
      <div className="lg:col-span-1">
        <TaskPriorityChart tasksByPriority={tasksByPriority} />
      </div>
      <div className="lg:col-span-2">
        <DashboardWrapper departments={departments} />
      </div>

      <div className="lg:col-span-2">
        <TaskCompletionTrend initialData={taskCompletionTrend} />
      </div>
      <div className="lg:col-span-2">
        <DepartmentPendingTasksChart pendingTasks={pendingTasks} />
      </div>
    </div>
  );
};
