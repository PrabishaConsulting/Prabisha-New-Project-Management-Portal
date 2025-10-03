// app/dashboard/page.tsx
import { getTodaysActivity } from "@/actions/live-Acticvity";
import { Dashboard } from "./_components/Dashboard";
import { getPendingTasksByDepartment } from "@/actions/pending-task-Department";
import { getTaskCompletionTrendData, getTasksByPriority } from "@/actions/task-action";
import { getAllDepartment } from "@/actions/department-action";

// Using a more standard naming convention for page components
export default async function DashboardPage() {
    const [todaysActivity, pendingTasksByDept , tasksByPriority , taskCompletionTrend , departments] = await Promise.all([
        getTodaysActivity(0), // Start with first 50 items
        getPendingTasksByDepartment(),
        getTasksByPriority(),
        getTaskCompletionTrendData(),
        getAllDepartment()
    ]);

    if (!todaysActivity || !pendingTasksByDept || !tasksByPriority || !taskCompletionTrend || !departments) {
        return <div>Loading...</div>
    }

    
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <Dashboard 
                TodaysActivity={todaysActivity.data} 
                pendingTasks={pendingTasksByDept.data} 
                tasksByPriority={tasksByPriority.data}
                taskCompletionTrend={taskCompletionTrend} // Pass the trend data
                departments={departments}
            />
        </div>
    );
}